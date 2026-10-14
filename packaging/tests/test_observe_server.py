"""The `pstack serve` hub: event flow, run-record linkage and phase state, and the HTTP surface.

Run records here are written by the real run-record.py, installed into a throwaway git project the
way `pstack init` installs it, so the phase view is checked against the file format it reads.
"""
import http.client
import json
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

model = pytest.importorskip("pstack_cli.observe.model")
from pstack_cli.observe import server as srv  # noqa: E402

SCRIPTS = REPO / "core" / "skills" / "poteto-mode" / "scripts"
GIT = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t",
       "GIT_COMMITTER_EMAIL": "t@t", "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1"}


class Clock:
    def __init__(self, t=1_800_000_000.0):
        self.t = t

    def __call__(self):
        return self.t


class FakeReader:
    host = "claude"

    def __init__(self):
        self.logs = {}
        self.cwd = {}
        self.mtime = {}

    def add(self, sid, cwd, events, mtime):
        self.logs.setdefault(sid, []).extend(events)
        self.cwd[sid] = cwd
        self.mtime[sid] = mtime

    def discover(self):
        return [model.SessionRef(host="claude", id=sid, paths=(f"/fake/{sid}.jsonl",), mtime=self.mtime[sid], cwd=self.cwd[sid])
                for sid in self.logs]

    def read(self, ref, cursor):
        start = cursor or 0
        events = [dict(e) for e in self.logs[ref.id][start:]]
        return events, len(self.logs[ref.id])


def ts(t):
    return srv.iso(t)


@pytest.fixture
def project(tmp_path):
    p = tmp_path / "proj"
    p.mkdir()
    subprocess.run(["git", "init", "-q"], cwd=p, check=True, env=GIT)
    (p / "app.py").write_text("x = 1\n")
    subprocess.run(["git", "add", "app.py"], cwd=p, check=True, env=GIT)
    subprocess.run(["git", "commit", "-qm", "base"], cwd=p, check=True, env=GIT)
    dest = p / ".claude" / "skills" / "poteto-mode" / "scripts"
    dest.mkdir(parents=True)
    shutil.copy(SCRIPTS / "run-record.py", dest / "run-record.py")
    shutil.copy(SCRIPTS / "routes.json", dest / "routes.json")
    return p


def rr(project, *args, session=None):
    env = {**GIT}
    env.pop("CLAUDE_CODE_SESSION_ID", None)
    if session:
        env["CLAUDE_CODE_SESSION_ID"] = session
    r = subprocess.run([sys.executable, str(project / ".claude/skills/poteto-mode/scripts/run-record.py"), *args],
                       cwd=project, capture_output=True, text=True, env=env)
    assert r.returncode in (0, 1), r.stdout + r.stderr
    return r.stdout


def hub_with(reader, clock):
    h = srv.Hub(Path("/nonexistent"), readers={"claude": reader}, clock=clock)
    h._last_runs = -1e9
    return h


def start_events(cwd, t):
    return [{"ts": ts(t), "agent": "main", "kind": "session_start", "cwd": str(cwd), "branch": "main",
             "model": "opus", "title": "fix"},
            {"ts": ts(t + 1), "agent": "main", "kind": "prompt", "text": "fix the duplicate email"}]


def test_events_get_increasing_seq_and_reach_only_their_subscribers(tmp_path):
    clock, reader = Clock(), FakeReader()
    reader.add("a", str(tmp_path), start_events(tmp_path, clock.t), clock.t)
    reader.add("b", str(tmp_path), start_events(tmp_path, clock.t), clock.t)
    hub = hub_with(reader, clock)
    qa, qall = hub.subscribe("claude:a"), hub.subscribe(None)
    hub.tick()
    got = [m for m in iter(lambda: qa.get_nowait() if not qa.empty() else None, None)]
    events = [d["event"] for n, d in got if n == "event"]
    assert [e["seq"] for e in events] == [1, 2]
    assert all(d["session"] == "claude:a" for n, d in got if n == "event")
    names = [n for n, _ in iter(lambda: qall.get_nowait() if not qall.empty() else None, None)]
    assert "event" not in names and "sessions" in names


def test_new_events_are_read_incrementally(tmp_path):
    clock, reader = Clock(), FakeReader()
    reader.add("a", str(tmp_path), start_events(tmp_path, clock.t), clock.t)
    hub = hub_with(reader, clock)
    hub.tick()
    clock.t += 3
    reader.add("a", str(tmp_path), [{"ts": ts(clock.t), "agent": "main", "kind": "tool_start", "id": "t1",
                                     "tool": "Bash", "summary": "pytest", "input": {}}], clock.t)
    hub.tick()
    events = hub.session_payload("claude:a")["events"]
    assert [e["seq"] for e in events] == [1, 2, 3]
    assert events[-1]["summary"] == "pytest"


def test_run_links_by_session_id_and_shows_phase_progress(project):
    clock, reader = Clock(), FakeReader()
    reader.add("s1", str(project), start_events(project, clock.t), clock.t)
    rr(project, "init", "--route", "feature", "--task", "add export", session="s1")
    rr(project, "phase", "step-1", "--done")
    rr(project, "phase", "step-2", "--skip", "one function")
    hub = hub_with(reader, clock)
    q = hub.subscribe("claude:s1")
    hub.tick()
    run = hub.session_payload("claude:s1")["runs"][0]
    assert run["linked_by"] == "session" and run["route"] == "feature"
    states = {p["id"]: p["state"] for p in run["phases"]}
    assert states["step-1"] == "done" and states["step-2"] == "skipped"
    assert run["path"] == ["step-1", "step-2"]
    assert run["check"]["complete"] is False and any("step-3" in p for p in run["check"]["problems"])
    assert any(n == "run" for n, _ in iter(lambda: q.get_nowait() if not q.empty() else None, None))
    summary = hub.sessions_payload()["sessions"][0]["run"]
    assert summary["route_title"] and summary["done"] == 2 and summary["total"] == len(run["phases"])


def test_a_session_id_from_another_session_does_not_link(project):
    clock, reader = Clock(), FakeReader()
    reader.add("mine", str(project), start_events(project, clock.t), clock.t)
    rr(project, "init", "--route", "feature", "--task", "x", session="someone-else")
    hub = hub_with(reader, clock)
    hub.tick()
    assert hub.session_payload("claude:mine")["runs"] == []


def test_explicit_session_link_can_cross_starting_directories(project, tmp_path):
    clock, reader = Clock(), FakeReader()
    other = tmp_path / "session origin"
    other.mkdir()
    reader.add("owner", str(project), start_events(project, clock.t), clock.t)
    reader.add("traveler", str(other), start_events(other, clock.t), clock.t)
    rr(project, "init", "--route", "feature", "--task", "work in another project", session="traveler")
    rr(project, "phase", "step-1", "--start")
    hub = hub_with(reader, clock)
    hub.tick()
    detail = hub.session_payload("claude:traveler")
    assert len(detail["runs"]) == 1
    assert detail["runs"][0]["linked_by"] == "session"
    assert detail["runs"][0]["current"] == "step-1"
    assert detail["session"]["cwd"] == str(other)
    assert hub.session_payload("claude:owner")["runs"] == []


def test_run_init_output_discovers_project_outside_session_directory(project, tmp_path):
    clock, reader = Clock(), FakeReader()
    other = tmp_path / "session origin"
    other.mkdir()
    output = rr(project, "init", "--route", "feature", "--task", "work elsewhere", session="traveler")
    events = start_events(other, clock.t) + [
        {"ts": ts(clock.t + 1), "agent": "main", "kind": "tool_end", "id": "init",
         "ok": True, "summary": output}]
    reader.add("traveler", str(other), events, clock.t)
    hub = hub_with(reader, clock)
    hub.tick()
    assert len(hub.session_payload("claude:traveler")["runs"]) == 1
    assert hub.session_payload("claude:traveler")["runs"][0]["linked_by"] == "session"


def test_discovered_project_does_not_expand_time_fallback(project, tmp_path):
    clock, reader = Clock(), FakeReader()
    other = tmp_path / "origin"
    other.mkdir()
    output = rr(project, "init", "--route", "feature", "--task", "legitimate", session="traveler")
    legitimate = output.split()[1]
    unrelated = rr(project, "init", "--route", "feature", "--task", "unrelated").split()[1]
    record_path = project / ".pstack" / "runs" / f"{unrelated}.json"
    record = json.loads(record_path.read_text())
    record["created"] = ts(clock.t)
    record_path.write_text(json.dumps(record))
    reader.add("traveler", str(other), start_events(other, clock.t) + [
        {"ts": ts(clock.t + 1), "agent": "main", "kind": "tool_end", "id": "init", "ok": True, "summary": output}], clock.t)
    hub = hub_with(reader, clock)
    hub.tick()
    assert [r["id"] for r in hub.session_payload("claude:traveler")["runs"]] == [legitimate]


def test_codex_init_output_survives_real_reader_summary(project, tmp_path):
    from pstack_cli.observe.readers.codex import CodexReader

    clock = Clock()
    origin = tmp_path / "origin"
    origin.mkdir()
    output = rr(project, "init", "--route", "feature", "--task", "nested output",
                "--host", "codex", "--session-id", "traveler")
    path = tmp_path / ".codex/sessions/2026/01/01/rollout-session.jsonl"
    path.parent.mkdir(parents=True)
    records = [
        {"type": "session_meta", "timestamp": ts(clock.t), "payload": {"id": "traveler", "cwd": str(origin)}},
        {"type": "response_item", "timestamp": ts(clock.t + 1), "payload": {
            "type": "function_call_output", "call_id": "init",
            "output": 'Script completed\nOutput:\n{"i":0}\n' + json.dumps({"i": 1, "value": {"output": output}})}}]
    path.write_text("\n".join(json.dumps(r) for r in records) + "\n")
    hub = srv.Hub(tmp_path, readers={"codex": CodexReader(tmp_path)}, clock=clock, days=10000)
    hub.tick()
    linked = hub.session_payload("codex:traveler")["runs"]
    assert [(r["id"], r["linked_by"]) for r in linked] == [(output.split()[1], "session")]


def test_run_evidence_survives_timeline_eviction(project, tmp_path):
    clock, reader = Clock(), FakeReader()
    other = tmp_path / "origin"
    other.mkdir()
    output = rr(project, "init", "--route", "feature", "--task", "long session")
    events = start_events(other, clock.t) + [
        {"ts": ts(clock.t + 1), "agent": "main", "kind": "tool_end", "id": "init", "ok": True, "summary": output}]
    events.extend({"ts": ts(clock.t + 2), "agent": "main", "kind": "tool_end", "id": f"tool-{i}",
                   "ok": True, "summary": "unrelated output"} for i in range(srv.MAX_EVENTS + 1))
    reader.add("traveler", str(other), events, clock.t)
    hub = hub_with(reader, clock)
    hub.tick()
    detail = hub.session_payload("claude:traveler")
    assert len(detail["events"]) == srv.MAX_EVENTS
    assert not any(e.get("id") == "init" for e in detail["events"])
    assert [(r["id"], r["linked_by"]) for r in detail["runs"]] == [(output.split()[1], "output")]


def test_run_links_by_init_output_when_no_session_id(project):
    clock, reader = Clock(), FakeReader()
    out = rr(project, "init", "--route", "investigation", "--task", "why")
    run_id = out.split()[1]
    events = start_events(project, clock.t - 10_000) + [
        {"ts": ts(clock.t), "agent": "main", "kind": "tool_end", "id": "t1", "ok": True, "summary": out.strip()}]
    reader.add("s2", str(project), events, clock.t)
    hub = hub_with(reader, clock)
    hub.tick()
    run = hub.session_payload("claude:s2")["runs"][0]
    assert run["id"] == run_id and run["linked_by"] == "output"


@pytest.mark.parametrize("run_id", ["fix.v2", "fix v2"])
def test_custom_run_id_links_from_real_init_output(project, tmp_path, run_id):
    clock, reader = Clock(), FakeReader()
    origin = tmp_path / "origin"
    origin.mkdir()
    output = rr(project, "--run", run_id, "init", "--route", "investigation", "--task", "custom id")
    reader.add("traveler", str(origin), start_events(origin, clock.t) + [
        {"ts": ts(clock.t + 1), "agent": "main", "kind": "tool_end", "id": "init", "ok": True,
         **model.tool_result_fields(output, "Run initialized")}], clock.t)
    hub = hub_with(reader, clock)
    hub.tick()
    assert [(r["id"], r["linked_by"]) for r in hub.session_payload("claude:traveler")["runs"]] == [
        (run_id, "output")]


def test_bug_fix_back_edge_shows_as_revisit(project):
    clock, reader = Clock(), FakeReader()
    reader.add("s3", str(project), start_events(project, clock.t), clock.t)
    rr(project, "init", "--route", "bug-fix", "--task", "dup email", session="s3")
    for p in ("reproduce", "root-cause", "plan", "implement", "cleanup", "review", "verify", "root-cause"):
        rr(project, "phase", p, "--done", "--note", "parent: test")
    hub = hub_with(reader, clock)
    hub.tick()
    run = hub.session_payload("claude:s3")["runs"][0]
    states = {p["id"]: p["state"] for p in run["phases"]}
    assert states["root-cause"] == "revisited"
    assert run["path"][-2:] == ["verify", "root-cause"]
    back = [e for e in run["edges"] if e["kind"] == "back"]
    assert {"from": "verify", "to": "root-cause"}.items() <= {k: v for k, v in back[0].items() if k in ("from", "to")}.items() or \
        any(e["from"] == "verify" and e["to"] == "root-cause" for e in back)


@pytest.fixture
def http_hub(tmp_path):
    clock, reader = Clock(), FakeReader()
    reader.add("h", str(tmp_path), start_events(tmp_path, clock.t), clock.t)
    hub = hub_with(reader, clock)
    hub.tick()
    httpd = srv.ThreadingHTTPServer(("127.0.0.1", 0), None)
    port = httpd.server_address[1]
    httpd.RequestHandlerClass = srv.handler_for(hub, {f"127.0.0.1:{port}", f"localhost:{port}"})
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield hub, port
    httpd.shutdown()
    httpd.server_close()


def get(port, path, host=None):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    c.request("GET", path, headers={"Host": host or f"127.0.0.1:{port}"})
    r = c.getresponse()
    return r.status, r.getheader("Content-Type"), r.read()


def test_api_sessions_and_detail(http_hub):
    hub, port = http_hub
    code, ctype, body = get(port, "/api/sessions")
    assert code == 200 and ctype == "application/json"
    sessions = json.loads(body)["sessions"]
    assert sessions[0]["key"] == "claude:h"
    code, _, body = get(port, "/api/sessions/claude%3Ah")
    detail = json.loads(body)
    assert code == 200 and len(detail["events"]) == 2 and detail["session"]["key"] == "claude:h"
    assert get(port, "/api/sessions/claude%3Anope")[0] == 404


def test_foreign_host_header_is_refused(http_hub):
    _, port = http_hub
    assert get(port, "/api/sessions", host="evil.example:80")[0] == 403


def test_routes_endpoint_serves_every_playbook(http_hub):
    _, port = http_hub
    code, _, body = get(port, "/api/routes")
    routes = json.loads(body)
    assert code == 200 and {"bug-fix", "feature", "investigation", "opening-a-pr"} <= set(routes)


def test_stream_starts_with_sessions_then_delivers_events(http_hub):
    hub, port = http_hub
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    c.request("GET", "/api/stream?session=claude%3Ah", headers={"Host": f"127.0.0.1:{port}"})
    r = c.getresponse()
    assert r.getheader("Content-Type") == "text/event-stream"

    def message():
        name = data = None
        while True:
            line = r.fp.readline().decode().rstrip("\n")
            if line.startswith("event: "):
                name = line[7:]
            elif line.startswith("data: "):
                data = json.loads(line[6:])
            elif line == "" and name:
                return name, data

    assert message()[0] == "sessions"
    hub._send("event", {"session": "claude:h", "event": {"kind": "prompt", "seq": 9}}, "claude:h")
    name, data = message()
    assert name == "event" and data["event"]["seq"] == 9


def test_page_is_served_with_a_no_network_policy(http_hub):
    if not srv.UI.is_file():
        pytest.skip("ui/index.html not written yet")
    _, port = http_hub
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    c.request("GET", "/", headers={"Host": f"127.0.0.1:{port}"})
    r = c.getresponse()
    assert r.status == 200 and "connect-src 'self'" in r.getheader("Content-Security-Policy")


def test_cli_refuses_a_non_loopback_bind_without_expose():
    from pstack_cli.cli import main
    assert main(["serve", "--bind", "0.0.0.0", "--port", "0"]) == 2


def git_in(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, env=GIT, capture_output=True)


def worktree(project, path):
    """A linked worktree of `project`, with run-record.py installed in it as pstack init would."""
    git_in(project, "worktree", "add", "-q", str(path))
    dest = path / ".claude" / "skills" / "poteto-mode" / "scripts"
    dest.mkdir(parents=True)
    shutil.copy(SCRIPTS / "run-record.py", dest / "run-record.py")
    shutil.copy(SCRIPTS / "routes.json", dest / "routes.json")
    return path


def rr_at(cwd, *args, session=None):
    env = {**GIT}
    env.pop("CLAUDE_CODE_SESSION_ID", None)
    if session:
        env["CLAUDE_CODE_SESSION_ID"] = session
    r = subprocess.run([sys.executable, str(cwd / ".claude/skills/poteto-mode/scripts/run-record.py"), *args],
                       cwd=cwd, capture_output=True, text=True, env=env)
    assert r.returncode in (0, 1), r.stdout + r.stderr
    return r.stdout


@pytest.mark.parametrize("nested", [False, True])
def test_a_worktree_session_sees_its_run_in_the_main_checkout(project, tmp_path, nested):
    wt = worktree(project, project / ".claude" / "worktrees" / "x" if nested else tmp_path / "wt")
    clock, reader = Clock(), FakeReader()
    reader.add("s1", str(wt), start_events(wt, clock.t), clock.t)
    rr_at(wt, "init", "--route", "feature", "--task", "in a worktree", session="s1")
    assert list((project / ".pstack" / "runs").glob("*.json")), "the record lives in the main checkout"
    hub = hub_with(reader, clock)
    hub.tick()
    assert [r["linked_by"] for r in hub.session_payload("claude:s1")["runs"]] == ["session"]


def test_a_worktree_without_its_own_pstack_still_finds_the_main_checkouts_runs(project, tmp_path):
    """The worktree is the session's checkout because of its .git, not because it holds records."""
    wt = worktree(project, tmp_path / "wt")
    clock, reader = Clock(), FakeReader()
    reader.add("s1", str(wt), start_events(wt, clock.t), clock.t)
    rr(project, "init", "--route", "feature", "--task", "started from the main checkout", session="s1")
    assert not (wt / ".pstack").exists()
    hub = hub_with(reader, clock)
    hub.tick()
    assert [r["linked_by"] for r in hub.session_payload("claude:s1")["runs"]] == ["session"]


def test_time_links_follow_the_run_workspace_not_the_record_store(project, tmp_path):
    import time as _time
    wt = worktree(project, tmp_path / "wt")
    clock, reader = Clock(_time.time()), FakeReader()
    reader.add("main", str(project), start_events(project, clock.t), clock.t)
    reader.add("side", str(wt), start_events(wt, clock.t), clock.t)
    in_wt = rr_at(wt, "init", "--route", "feature", "--task", "worktree work").split()[1]
    in_main = rr_at(project, "init", "--route", "feature", "--task", "main work").split()[1]
    hub = hub_with(reader, clock)
    hub.tick()
    assert [(r["id"], r["linked_by"]) for r in hub.session_payload("claude:side")["runs"]] == [(in_wt, "time")]
    assert [(r["id"], r["linked_by"]) for r in hub.session_payload("claude:main")["runs"]] == [(in_main, "time")]


def test_the_observer_survives_record_dirs_failing(project):
    clock, reader = Clock(), FakeReader()
    reader.add("s1", str(project), start_events(project, clock.t), clock.t)
    rr(project, "init", "--route", "feature", "--task", "x", session="s1")
    hub = hub_with(reader, clock)
    real = hub.checker._module

    class Broken:
        def __init__(self, mod):
            self._mod = mod

        def __getattr__(self, name):
            return getattr(self._mod, name)

        def record_dirs(self, root):
            raise RuntimeError("git broke")

    hub.checker._module = lambda cwd: Broken(real(cwd))
    hub.tick()  # must not raise
    assert [r["linked_by"] for r in hub.session_payload("claude:s1")["runs"]] == ["session"]

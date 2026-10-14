import json
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

from test_observe_server import Clock, FakeReader, GIT, hub_with, project, rr, start_events
from pstack_cli.observe import runs
from pstack_cli.observe import server as srv


def record(project):
    current = (project / ".pstack/runs/current").read_text().strip()
    return json.loads((project / f".pstack/runs/{current}.json").read_text())


def view(project, working=True):
    return runs.view(record(project), {}, working, None, "session")


def reject(project, *args):
    script = project / ".claude/skills/poteto-mode/scripts/run-record.py"
    result = subprocess.run([sys.executable, str(script), *args], cwd=project, env=GIT,
                            capture_output=True, text=True)
    assert result.returncode == 2, result.stdout + result.stderr
    return result.stderr


def test_start_does_not_satisfy_completion_and_old_marks_do_not_guess_current(project):
    rr(project, "init", "--route", "custom", "--phases", "survey,build", "--task", "x")
    rr(project, "phase", "survey", "--start")
    assert "phase survey: started" in rr(project, "check")
    assert view(project, working=False)["active"] == ["survey"]
    rr(project, "phase", "survey", "--done")
    v = view(project)
    assert v["current"] is None and v["active"] == []
    assert v["phases"][1]["state"] == "pending"
    rec = record(project)
    rec["phases"] = [{"seq": 1, "name": "survey", "status": "done", "at": rec["created"]}]
    legacy = runs.view(rec, {}, True, None, None)
    assert legacy["tracking"] == "completion-only" and legacy["current"] is None


def test_parallel_steps_join_and_record_exact_agent_and_evidence(project):
    rr(project, "init", "--route", "bug-fix", "--task", "x", "--host", "codex", "--session-id", "thread-1")
    assert record(project)["session"] == {"host": "codex", "id": "thread-1"}
    rr(project, "phase", "root-cause", "--start")
    with ThreadPoolExecutor(2) as pool:
        futures = [pool.submit(rr, project, "phase", f"root-cause/{name}", "--start", "--agent", agent,
                               "--from", "root-cause", "--reason", "investigate in parallel")
                   for name, agent in (("how", "agent-how"), ("why", "agent-why"))]
        for f in futures:
            f.result()
    v = view(project)
    assert set(v["active"]) == {"root-cause", "root-cause/how", "root-cause/why"}
    assert len({m["seq"] for m in record(project)["phases"]}) == 3
    assert "Resolve it before closing" in reject(project, "phase", "root-cause", "--done")
    output = project / ".pstack/how.txt"
    output.write_text("runtime evidence")
    rr(project, "evidence", "--kind", "repro", "--result", "fail", "--output", str(output),
       "--phase", "root-cause/how", "--tool-id", "tool-how")
    evidence = record(project)["evidence"][-1]
    assert evidence["agent"] == "agent-how" and evidence["instance"] == "root-cause/how@1"
    rr(project, "phase", "root-cause/how", "--done")
    rr(project, "phase", "root-cause/why", "--done")
    rr(project, "phase", "root-cause/confirm", "--start", "--from", "root-cause/how",
       "--from", "root-cause/why", "--reason", "test both reports", "--evidence", str(evidence["seq"]))
    v = view(project)
    assert v["active"] == ["root-cause", "root-cause/confirm"]
    assert {e["from"] for e in v["transitions"][-2:]} == {"root-cause/how", "root-cause/why"}
    assert v["evidence"][0]["tool_ids"] == ["tool-how"]
    rr(project, "phase", "root-cause/confirm", "--done")
    rr(project, "phase", "root-cause", "--done")
    assert view(project)["active"] == []


def test_failed_verification_returns_immediately_and_keeps_attempt_history(project):
    rr(project, "init", "--route", "bug-fix", "--task", "x")
    rr(project, "phase", "root-cause", "--start")
    rr(project, "phase", "root-cause/how", "--start")
    rr(project, "phase", "root-cause/how", "--done")
    rr(project, "phase", "root-cause", "--done")
    rr(project, "phase", "verify", "--start")
    rr(project, "phase", "verify", "--fail", "original reproduction still fails")
    assert view(project)["current"] is None
    rr(project, "phase", "root-cause", "--start", "--from", "verify", "--reason", "retest mechanism")
    v = view(project)
    assert v["current"] == "root-cause"
    phases = {p["id"]: p for p in v["phases"] + v["steps"]}
    assert phases["verify"]["state"] == "failed"
    assert phases["root-cause"]["attempt"] == 2
    assert phases["root-cause/how"]["state"] == "pending"
    assert len(phases["root-cause/how"]["marks"]) == 2
    assert v["transitions"][-1]["to_instance"] == "root-cause@2"
    assert "started" in rr(project, "check")
    assert v["path"] == ["root-cause", "verify", "root-cause"]


def test_block_pause_resume_and_invalid_transitions_preserve_record(project):
    rr(project, "init", "--route", "bug-fix", "--task", "x")
    rr(project, "phase", "plan", "--start")
    rr(project, "phase", "plan/architect-c", "--start")
    rr(project, "phase", "plan/architect-c", "--block", "approval requested")
    assert view(project)["steps"][-1]["state"] == "blocked"
    before = record(project)
    assert "already has an open attempt" in reject(project, "phase", "plan", "--start")
    assert "recorded outcome" in reject(project, "phase", "implement", "--start", "--from", "plan", "--reason", "go")
    assert "sequence numbers" in reject(project, "phase", "verify", "--start", "--evidence", "999")
    assert record(project) == before
    rr(project, "pause", "--next", "wait for approval")
    assert view(project)["active"] == []
    assert next(p for p in view(project)["phases"] if p["id"] == "plan")["state"] == "paused"
    assert "paused" in reject(project, "phase", "plan/architect-c", "--done")
    rr(project, "resume")
    rr(project, "phase", "plan/architect-c", "--start")
    assert view(project)["steps"][-1]["attempt"] == 1
    rr(project, "phase", "plan/architect-c", "--done")
    rr(project, "phase", "plan", "--done")


def test_graph_is_frozen_and_explicit_run_ids_isolate_sessions(project):
    rr(project, "init", "--route", "bug-fix", "--task", "one", "--host", "copilot", "--session-id", "one")
    first = record(project)
    rr(project, "init", "--route", "bug-fix", "--task", "two", "--host", "copilot", "--session-id", "two")
    second = record(project)
    assert first["run"] != second["run"]
    rr(project, "--run", first["run"], "phase", "root-cause", "--start")
    assert record(project)["seq"] == 0
    graph_file = project / ".claude/skills/poteto-mode/scripts/routes.json"
    graph_file.write_text("{}")
    rr(project, "--run", first["run"], "phase", "root-cause/how", "--start")
    assert view(project)["steps"]
    assert runs.link(first, {"host": "copilot", "id": "two"}, "") is None


def test_resumed_legacy_run_records_nested_steps_without_losing_history(project):
    rr(project, "init", "--route", "bug-fix", "--task", "old run")
    rec = record(project)
    rec.pop("graph")
    rec.pop("schema_version")
    rec["phases"] = [{"name": "reproduce", "status": "done", "note": "old baseline", "seq": 1, "at": rec["created"]}]
    rec["seq"] = 1
    (project / f".pstack/runs/{rec['run']}.json").write_text(json.dumps(rec))
    rr(project, "phase", "root-cause", "--start")
    rr(project, "phase", "root-cause/how", "--start")
    assert "root-cause/how" in view(project)["active"]
    assert record(project)["phases"][0] == rec["phases"][0]


def test_run_changes_stream_without_new_host_activity(project):
    clock, reader = Clock(), FakeReader()
    reader.add("live", str(project), start_events(project, clock.t), clock.t)
    rr(project, "init", "--route", "feature", "--task", "x", session="live")
    hub = hub_with(reader, clock)
    q = hub.subscribe("claude:live")
    hub.tick()
    while not q.empty():
        q.get_nowait()
    rr(project, "phase", "step-1", "--start")
    clock.t += 3
    hub.tick()
    messages = []
    while not q.empty():
        messages.append(q.get_nowait())
    assert any(kind == "run" and payload["run"]["active"] == ["step-1"] for kind, payload in messages)


def test_verification_rejects_skip_and_reopening_cannot_reuse_evidence(project):
    rr(project, "init", "--route", "custom", "--phases", "verify", "--task", "x")
    assert "mandatory requirement" in reject(project, "phase", "verify", "--skip", "not applicable originally")
    rr(project, "phase", "verify", "--start")
    output = project / ".pstack/verify.txt"
    output.write_text("passing fixture")
    rr(project, "evidence", "--kind", "verify", "--result", "pass", "--output", str(output), "--phase", "verify")
    rr(project, "phase", "verify", "--done")
    assert "complete" in rr(project, "check")
    rr(project, "phase", "verify", "--start")
    rr(project, "phase", "verify", "--done")
    assert "no verification recorded" in rr(project, "check")


def test_workflow_in_browser_with_real_records(project, tmp_path):
    import pytest
    import time
    from test_observe_ui import browser_bin, node_bin, SHOTS, TESTS

    chrome, node = browser_bin(), node_bin()
    if not chrome or not node:
        pytest.skip("headless browser or Node unavailable")
    clock, reader = Clock(time.time()), FakeReader()
    reader.add("browser-workflow", str(project), start_events(project, clock.t), clock.t)
    rr(project, "init", "--route", "bug-fix", "--task", "Track parallel investigation", session="browser-workflow")
    rr(project, "phase", "root-cause", "--start")
    rr(project, "phase", "root-cause/how", "--start", "--agent", "how-agent")
    rr(project, "phase", "root-cause/why", "--start", "--agent", "why-agent")
    hub = hub_with(reader, clock)
    hub.tick()
    httpd = srv.ThreadingHTTPServer(("127.0.0.1", 0), None)
    port = httpd.server_address[1]
    httpd.RequestHandlerClass = srv.handler_for(hub, {f"127.0.0.1:{port}"})
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    SHOTS.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen([node, str(TESTS / "observe_workflow_browser.js"), chrome,
        f"http://127.0.0.1:{port}", str(tmp_path / "browser"), str(SHOTS / "workflow.png")],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        import select
        readable, _, _ = select.select([proc.stdout], [], [], 150)
        assert readable, "browser did not reach parallel state"
        line = proc.stdout.readline().strip()
        assert line == "parallel-ready", line
        rr(project, "phase", "root-cause/how", "--done")
        rr(project, "phase", "root-cause/why", "--done")
        rr(project, "phase", "root-cause", "--done")
        rr(project, "phase", "verify", "--start")
        output = project / ".pstack/verify.txt"
        output.write_text("test failed output")
        rr(project, "evidence", "--kind", "verify", "--result", "fail", "--output", str(output),
           "--command", "pytest original_repro.py", "--phase", "verify", "--tool-id", "verify-call")
        rr(project, "phase", "verify", "--fail", "reproduction failed")
        rr(project, "phase", "root-cause", "--start", "--from", "verify", "--reason", "retest mechanism")
        reader.add("browser-workflow", str(project), [
            {"ts": srv.iso(clock.t), "agent": "main", "kind": "tool_start", "id": "verify-call",
             "tool": "shell", "summary": "pytest original_repro.py", "input": {}},
            {"ts": srv.iso(clock.t + 1), "agent": "main", "kind": "tool_end", "id": "verify-call",
             "ok": False, "summary": "test failed output"}], clock.t + 1)
        clock.t += 3
        hub.tick()
        out, err = proc.communicate(timeout=30)
        assert proc.returncode == 0, out + err
        assert json.loads(out)["parallel"] is True
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.communicate()
        httpd.shutdown()
        httpd.server_close()

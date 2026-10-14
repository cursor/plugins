#!/usr/bin/env python3
"""Standard-library mock of the `pstack serve` HTTP API and SSE stream (observe/CONTRACT.md §4, §5).

    python packaging/tests/observe_mock_server.py [--port 8765] [--speed 1] [--ping 15]

It serves the real observe/ui/index.html at `/`, and at `/api/*` exactly the endpoints the contract
defines, from synthetic data in tests/fixtures/observe_ui/:

The legacy phase responses exercise compatibility with older servers. Explicit phase lifecycle
and parallel-step browser coverage uses the real recorder and server in test_observe_workflow.py.

- sessions.json     static sessions on every host and in every state, a generated 3000-event session
- live_script.json  a bug-fix run that plays out in real time after startup: prompts, tool calls,
                    subagents, phase marks with a back edge, a failed verify, and a complete check
- routes.json       the phase graphs served at /api/routes

Mock-only controls, never used by the page:
    GET /__mock/state   {"step": i, "steps": n, "done": bool}
    GET /__mock/drop    close every open stream, to exercise the page's reconnect
    GET /__mock/start   begin the scripted run, when the server was started with --hold
"""
import argparse
import json
import queue
import random
import re
import sys

sys.dont_write_bytecode = True  # it loads run-record.py from core, which must stay free of bytecode
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

HERE = Path(__file__).resolve().parent
FIXTURES = HERE / "fixtures" / "observe_ui"
UI = HERE.parent / "src" / "pstack_cli" / "observe" / "ui" / "index.html"
MAX_EVENTS = 3000
OFFSET = re.compile(r"^@(-?\d+(?:\.\d+)?)$")


def iso(t):
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(t)) + ".%03dZ" % int((t % 1) * 1000)


def resolve_times(obj, t0):
    """Replace every "@-N" string with the ISO time N seconds before t0."""
    if isinstance(obj, dict):
        return {k: resolve_times(v, t0) for k, v in obj.items()}
    if isinstance(obj, list):
        return [resolve_times(v, t0) for v in obj]
    if isinstance(obj, str):
        m = OFFSET.match(obj)
        if m:
            return iso(t0 + float(m.group(1)))
    return obj


def parse_iso(s):
    try:
        return time.mktime(time.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")) - time.timezone
    except (TypeError, ValueError):
        return 0.0


class Session:
    """One session's events and the reductions the contract asks the server to serve."""

    def __init__(self, host, sid, title=None, state=None, agent_states=None, runs=None):
        self.host, self.id, self.key = host, sid, f"{host}:{sid}"
        self.title, self.cwd, self.branch, self.model = title, None, None, None
        self.state_override = state
        self.agent_states = agent_states or {}
        self.events, self.seq = [], 0
        self.agents = {}
        self.runs = runs or []
        self.last_prompt = None

    def add(self, ev):
        """Append an event; return True when an agent's state changed."""
        ev = dict(ev)
        self.seq += 1
        ev["seq"] = self.seq
        self.events.append(ev)
        return self._reduce(ev)

    def _agent(self, aid, ts):
        a = self.agents.get(aid)
        if a is None:
            a = self.agents[aid] = {
                "id": aid, "parent": None if aid == "main" else "main", "type": "main" if aid == "main" else None,
                "model": self.model if aid == "main" else None, "description": None, "background": False,
                "state": "working", "started": ts, "ended": None, "events": 0, "last_activity": ts,
                "current": None, "_open": {},
            }
        return a

    def _reduce(self, ev):
        before = {k: a["state"] for k, a in self.agents.items()}
        kind, ts = ev.get("kind"), ev.get("ts")
        a = self._agent(ev.get("agent", "main"), ts)
        a["events"] += 1
        a["last_activity"] = ts
        if kind == "session_start":
            self.cwd, self.branch = ev.get("cwd"), ev.get("branch")
            self.model = ev.get("model") or self.model
            self.title = ev.get("title") or self.title
            if a["id"] == "main":
                a["model"] = self.model
        elif kind == "prompt":
            self.last_prompt = (ev.get("text") or "")[:200]
        if kind == "tool_start":
            a["_open"][ev.get("id")] = ev.get("summary") or ev.get("tool")
            a["current"] = a["_open"][ev.get("id")]
            a["state"] = "working"
        elif kind == "tool_end":
            a["_open"].pop(ev.get("id"), None)
            a["current"] = next(reversed(a["_open"].values()), None) if a["_open"] else None
        elif kind == "agent_start":
            sub = self._agent(ev["agent_id"], ts)
            sub.update(parent=ev.get("parent") or a["id"], type=ev.get("type"), model=ev.get("model"),
                       description=ev.get("description"), background=bool(ev.get("background")),
                       state="working", started=ts)
            sub["events"] = 0
        elif kind == "agent_end":
            sub = self._agent(ev["agent_id"], ts)
            sub.update(state="done" if ev.get("ok") else "failed", ended=ts, current=None)
            sub["_open"].clear()
        elif kind == "turn_end":
            a["state"], a["current"] = "waiting", None
            a["_open"].clear()
        elif a["state"] not in ("done", "failed"):
            a["state"] = "working"
        return before != {k: x["state"] for k, x in self.agents.items()}

    def agent_views(self):
        out = []
        for a in self.agents.values():
            v = {k: val for k, val in a.items() if not k.startswith("_")}
            v["state"] = self.agent_states.get(a["id"], v["state"])
            out.append(v)
        return out

    def working(self):
        return self.state() == "working"

    def state(self):
        if self.state_override:
            return self.state_override
        states = [a["state"] for a in self.agents.values()]
        if "working" in states:
            return "working"
        main = self.agents.get("main")
        return "waiting" if main and main["state"] == "waiting" else "idle"

    def summary(self, world):
        views = self.agent_views()
        run = None
        if self.runs:
            rv = world.run_view(self, self.runs[-1])
            run = {"id": rv["id"], "route": rv["route"], "route_title": rv["route_title"],
                   "current": rv["current"], "done": rv["_done"], "total": len(rv["phases"]),
                   "complete": rv["check"]["complete"]}
        return {
            "key": self.key, "host": self.host, "id": self.id, "title": self.title, "cwd": self.cwd,
            "branch": self.branch, "model": self.model,
            "started": self.events[0]["ts"] if self.events else None,
            "updated": self.events[-1]["ts"] if self.events else None,
            "state": self.state(), "last_prompt": self.last_prompt,
            "agents_total": len(views), "agents_working": sum(v["state"] == "working" for v in views),
            "run": run,
        }


class World:
    def __init__(self, routes):
        self.lock = threading.RLock()
        self.routes = routes
        self.sessions = {}

    def run_view(self, sess, run):
        """RunView per CONTRACT §4 and §5, computed from the run's phase marks in seq order."""
        route = self.routes.get(run["route"], {"title": run["route"], "phases": [], "edges": []})
        order = [p["id"] for p in route["phases"]]
        marks = run["marks"]
        per = {pid: [] for pid in order}
        for m in marks:
            per.setdefault(m["phase"], []).append(m)
        states = {}
        for pid in order:
            ms = per[pid]
            if not ms:
                states[pid] = "pending"
            elif sum(m["status"] == "done" for m in ms) > 1:
                states[pid] = "revisited"
            elif ms[-1]["status"] == "done":
                states[pid] = "done"
            else:
                states[pid] = "skipped"
        if marks:
            last = marks[-1]["phase"]
            i = order.index(last) if last in order else len(order)
            nxt = order[i + 1] if i + 1 < len(order) else None
        else:
            nxt = order[0] if order else None
        current = marks[-1]["phase"] if marks else None
        if sess.working() and nxt:
            states[nxt] = "active"
            current = nxt
        problems = []
        pause = run["pauses"][-1] if run["pauses"] and not run["pauses"][-1].get("resumed") else None
        if pause:
            problems.append(f"paused at seq {pause['seq']}: {pause['next']}. Continue with: run-record.py resume")
        for pid in order:
            if not per[pid]:
                problems.append(f"phase {pid}: not recorded. Mark it done, or skip it with a reason.")
        ver = [e for e in run["evidence"] if e.get("kind") == "verify"]
        if "verify" in order and ver and ver[-1].get("result") != "pass":
            problems.append(f"verify: the latest verification on the current code is {ver[-1]['result']}.")
        for f in run["findings"]:
            if f.get("status") == "open" and f.get("severity") in ("blocker", "act"):
                problems.append(f"finding {f['id']} ({f['severity']}): open. {f.get('summary', '')}")
        phases = []
        for p in route["phases"]:
            phases.append({"id": p["id"], "label": p.get("label"), "step": p.get("step"), "state": states[p["id"]],
                           "marks": [{"seq": m["seq"], "at": m["at"], "status": m["status"], "note": m.get("note", "")}
                                     for m in per[p["id"]]]})
        return {
            "id": run["id"], "route": run["route"], "route_title": route.get("title"), "task": run.get("task"),
            "created": run.get("created"), "linked_by": run.get("linked_by"), "session": run.get("session"),
            "phases": phases, "edges": route.get("edges", []), "path": [m["phase"] for m in marks],
            "current": current,
            "check": {"complete": not problems, "problems": problems,
                      "checked_at": run.get("checked_at") or iso(time.time())},
            "evidence": run["evidence"], "delegates": run["delegates"], "findings": run["findings"],
            "pause": pause,
            "_done": sum(s in ("done", "revisited", "skipped") for s in states.values()),
        }

    def public_run(self, sess, run):
        rv = self.run_view(sess, run)
        rv.pop("_done")
        return rv

    def sessions_payload(self):
        items = [s.summary(self) for s in self.sessions.values()]
        items.sort(key=lambda s: s["updated"] or "", reverse=True)
        return {"sessions": items, "now": iso(time.time())}

    def detail(self, key):
        s = self.sessions.get(key)
        if s is None:
            return None
        return {"session": s.summary(self), "agents": s.agent_views(), "events": s.events[-MAX_EVENTS:],
                "runs": [self.public_run(s, r) for r in s.runs]}


def generate_bulk(spec, t0):
    """A deterministic long session: turns of prompts, messages, tool pairs, subagents, usage."""
    rng = random.Random(7)
    count, span = spec["count"], spec["span_s"]
    end = t0 - spec.get("end_ago_s", 0)
    start = end - span
    evs = [{"agent": "main", "kind": "session_start", "cwd": spec["cwd"], "branch": spec["branch"],
            "model": spec["model"], "title": spec.get("title")}]
    tools = [("shell", "rg -n 'coldStart' packages/"), ("shell", "pnpm -F app test --run"), ("read", "packages/app/src/boot.ts"),
             ("edit", "packages/app/src/boot.ts"), ("shell", "hyperfine 'node dist/boot.js'"), ("read", "packages/core/src/cache.ts")]
    tid, turn, sub = 0, 0, 0
    while len(evs) < count - 2:
        turn += 1
        evs.append({"agent": "main", "kind": "prompt",
                    "text": f"Turn {turn}: shave another chunk off cold start. Focus on " + rng.choice(
                        ["module loading", "the config parse", "cache warmup", "the plugin registry"]) + "."})
        for _ in range(rng.randint(4, 12)):
            r = rng.random()
            agent = "main"
            if r < 0.08:
                sub += 1
                aid = f"sub-{sub}"
                tid += 1
                spawn_id = f"b{tid}"
                evs.append({"agent": "main", "kind": "tool_start", "id": spawn_id, "tool": "spawn_agent",
                            "summary": f"Profile hotspot #{sub}", "input": {}})
                evs.append({"agent": "main", "kind": "agent_start", "agent_id": aid, "parent": "main", "type": "worker",
                            "model": "gpt-5-mini", "description": f"Profile hotspot #{sub}", "background": False,
                            "tool_id": spawn_id})
                for _ in range(rng.randint(1, 4)):
                    tid += 1
                    name, summ = rng.choice(tools)
                    evs.append({"agent": aid, "kind": "tool_start", "id": f"b{tid}", "tool": name, "summary": summ, "input": {}})
                    evs.append({"agent": aid, "kind": "tool_end", "id": f"b{tid}", "ok": rng.random() > 0.1, "summary": "ok"})
                evs.append({"agent": "main", "kind": "agent_end", "agent_id": aid, "ok": True, "summary": "hotspot profiled"})
                evs.append({"agent": "main", "kind": "tool_end", "id": spawn_id, "ok": True, "summary": "hotspot profiled"})
            elif r < 0.7:
                tid += 1
                name, summ = rng.choice(tools)
                ok = rng.random() > 0.08
                evs.append({"agent": agent, "kind": "tool_start", "id": f"b{tid}", "tool": name, "summary": summ, "input": {}})
                evs.append({"agent": agent, "kind": "tool_end", "id": f"b{tid}", "ok": ok,
                            "summary": "exit 0" if ok else "exit 1: Error: ENOENT dist/boot.js"})
            elif r < 0.9:
                evs.append({"agent": agent, "kind": "message",
                            "text": "Cold start is now " + str(rng.randint(300, 900)) + "ms. " + "Next I'll look at lazy imports. " * rng.randint(1, 30)})
            elif r < 0.97:
                evs.append({"agent": agent, "kind": "usage", "input_tokens": rng.randint(1000, 90000),
                            "output_tokens": rng.randint(100, 5000), "cost_usd": None})
            else:
                evs.append({"agent": agent, "kind": "notice", "level": rng.choice(["info", "warn", "error"]),
                            "text": "rate limited; retrying"})
        evs.append({"agent": "main", "kind": "turn_end", "reason": "end_turn"})
    evs = evs[:count]
    for i, ev in enumerate(evs):
        ev["ts"] = iso(start + span * i / max(1, len(evs) - 1))
    return evs


class Hub:
    def __init__(self):
        self.lock = threading.Lock()
        self.clients = []

    def add(self, key):
        q = queue.Queue()
        with self.lock:
            self.clients.append((q, key))
        return q

    def remove(self, q):
        with self.lock:
            self.clients = [c for c in self.clients if c[0] is not q]

    def send(self, name, data, session=None):
        msg = f"event: {name}\ndata: {json.dumps(data)}\n\n"
        with self.lock:
            for q, key in self.clients:
                if session is None or key == session:
                    q.put(msg)

    def drop_all(self):
        with self.lock:
            for q, _ in self.clients:
                q.put(None)


class Script(threading.Thread):
    """Plays live_script.json into the world, broadcasting what the contract says the server sends."""

    def __init__(self, world, hub, spec, speed, hold=False):
        super().__init__(daemon=True)
        self.world, self.hub, self.speed = world, hub, speed
        # With hold, the run waits for GET /__mock/start, so a slow client still sees it from the start.
        self.go = threading.Event()
        if not hold:
            self.go.set()
        self.spec = spec
        self.steps = spec["steps"]
        self.index = 0
        self.done = False
        self.tool_n = 0
        self.spawns = {}
        self.run_seq = 0

    def sleep(self, s):
        if s > 0:
            time.sleep(s / self.speed)

    def run(self):
        self.go.wait()
        for i, step in enumerate(self.steps):
            self.sleep(step.get("wait", 0))
            self.apply(step)
            self.index = i + 1
        self.done = True

    def emit(self, sess, ev):
        with self.world.lock:
            ev = {"ts": iso(time.time()), **ev}
            before_state = sess.state()
            changed = sess.add(ev)
            stored = sess.events[-1]
            sessions = self.world.sessions_payload()
            agents = sess.agent_views() if changed else None
            run = self.world.public_run(sess, sess.runs[-1]) if sess.runs and before_state != sess.state() else None
        self.hub.send("event", {"session": sess.key, "event": stored}, session=sess.key)
        if agents is not None:
            self.hub.send("agents", {"session": sess.key, "agents": agents}, session=sess.key)
        if run is not None:
            self.hub.send("run", {"session": sess.key, "run": run}, session=sess.key)
        self.hub.send("sessions", sessions)

    def stamp(self, entry):
        self.run_seq += 1
        return {**entry, "seq": self.run_seq, "at": iso(time.time())}

    def run_changed(self, sess):
        with self.world.lock:
            run = self.world.public_run(sess, sess.runs[-1])
            sessions = self.world.sessions_payload()
        self.hub.send("run", {"session": sess.key, "run": run}, session=sess.key)
        self.hub.send("sessions", sessions)

    def apply(self, step):
        spec = self.spec["session"]
        key = f"{spec['host']}:{spec['id']}"
        with self.world.lock:
            sess = self.world.sessions.get(key)
            if sess is None:
                sess = self.world.sessions[key] = Session(spec["host"], spec["id"], title=spec.get("title"))
        if "ev" in step:
            self.emit(sess, step["ev"])
        elif "tool" in step:
            t = step["tool"]
            self.tool_n += 1
            tid = f"toolu_{self.tool_n:03d}"
            self.emit(sess, {"agent": t["agent"], "kind": "tool_start", "id": tid, "tool": t["tool"],
                             "summary": t["summary"], "input": {"command": t["summary"]}})
            self.sleep(t.get("dur", 0))
            self.emit(sess, {"agent": t["agent"], "kind": "tool_end", "id": tid, "ok": t["ok"], "summary": t["out"]})
        elif "spawn" in step:
            s = step["spawn"]
            self.tool_n += 1
            tid = f"toolu_{self.tool_n:03d}"
            self.spawns[s["agent_id"]] = (tid, s["agent"], s["background"])
            self.emit(sess, {"agent": s["agent"], "kind": "tool_start", "id": tid, "tool": "Agent",
                             "summary": s["description"], "input": {"description": s["description"],
                                                                     "subagent_type": s["type"]}})
            self.emit(sess, {"agent": s["agent"], "kind": "agent_start", "agent_id": s["agent_id"], "parent": s["agent"],
                             "type": s["type"], "model": s["model"], "description": s["description"],
                             "background": s["background"], "tool_id": tid})
            if s["background"]:
                self.emit(sess, {"agent": s["agent"], "kind": "tool_end", "id": tid, "ok": True,
                                 "summary": f"launched {s['agent_id']} in the background"})
        elif "finish" in step:
            f = step["finish"]
            tid, parent, bg = self.spawns[f["agent_id"]]
            self.emit(sess, {"agent": parent, "kind": "agent_end", "agent_id": f["agent_id"], "ok": f["ok"],
                             "summary": f["summary"]})
            if not bg:
                self.emit(sess, {"agent": parent, "kind": "tool_end", "id": tid, "ok": f["ok"], "summary": f["summary"]})
        elif "run_init" in step:
            r = step["run_init"]
            with self.world.lock:
                sess.runs.append({"id": r["id"], "route": r["route"], "task": r["task"], "created": iso(time.time()),
                                  "linked_by": r["linked_by"], "session": r.get("session"), "marks": [], "evidence": [],
                                  "delegates": [], "findings": [], "pauses": []})
            self.run_changed(sess)
        elif sess.runs:
            run = sess.runs[-1]
            with self.world.lock:
                if "mark" in step:
                    run["marks"].append(self.stamp(step["mark"]))
                elif "evidence" in step:
                    run["evidence"].append(self.stamp(step["evidence"]))
                elif "delegate" in step:
                    d = dict(step["delegate"])
                    prev = next((x for x in reversed(run["delegates"]) if x["job"] == d["job"]), {})
                    d.setdefault("role", prev.get("role"))
                    d.setdefault("model", prev.get("model"))
                    run["delegates"].append(self.stamp({"reason": "", "result": "", **d}))
                elif "finding" in step:
                    run["findings"].append(self.stamp({"status": "open", "reason": "", **step["finding"]}))
                elif "finding_resolve" in step:
                    fr = step["finding_resolve"]
                    for f in run["findings"]:
                        if f["id"] == fr["id"]:
                            f.update(status=fr["status"], reason=fr["reason"], resolved=self.stamp({}))
                elif "pause" in step:
                    run["pauses"].append(self.stamp({"resumed": None, **step["pause"]}))
                elif "resume" in step and run["pauses"]:
                    run["pauses"][-1]["resumed"] = self.stamp({})
            self.run_changed(sess)


def build_world(t0):
    routes = json.loads((FIXTURES / "routes.json").read_text())
    data = resolve_times(json.loads((FIXTURES / "sessions.json").read_text()), t0)
    world = World(routes)
    for spec in data["sessions"]:
        runs = []
        for r in spec.get("runs", []):
            run = dict(r)
            for n, m in enumerate(run["marks"], 1):
                m.setdefault("seq", n)
            runs.append(run)
        s = Session(spec["host"], spec["id"], title=spec.get("title"), state=spec.get("state"),
                    agent_states=spec.get("agent_states"), runs=runs)
        for ev in spec["events"]:
            s.add(ev)
        world.sessions[s.key] = s
    for spec in data.get("generated", []):
        s = Session(spec["host"], spec["id"], title=spec.get("title"), state=spec.get("state"))
        for ev in generate_bulk(spec, t0):
            s.add(ev)
        world.sessions[s.key] = s
    return world


def make_handler(world, hub, script, ping, verbose):
    class Handler(BaseHTTPRequestHandler):
        server_version = "pstack-observe-mock"

        def log_message(self, fmt, *args):
            if verbose:
                sys.stderr.write("mock: " + fmt % args + "\n")

        def send_json(self, obj, status=200):
            body = json.dumps(obj).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            u = urlsplit(self.path)
            path = u.path
            if path in ("/", "/index.html"):
                body = UI.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif path == "/api/sessions":
                with world.lock:
                    self.send_json(world.sessions_payload())
            elif path.startswith("/api/sessions/"):
                key = unquote(path[len("/api/sessions/"):])
                with world.lock:
                    d = world.detail(key)
                if d is None:
                    self.send_json({"error": f"no session {key}"}, 404)
                else:
                    self.send_json(d)
            elif path == "/api/routes":
                self.send_json(world.routes)
            elif path == "/api/stream":
                self.stream(parse_qs(u.query).get("session", [None])[0])
            elif path == "/__mock/state":
                self.send_json({"step": script.index, "steps": len(script.steps), "done": script.done})
            elif path == "/__mock/start":
                script.go.set()
                self.send_json({"started": True})
            elif path == "/__mock/drop":
                hub.drop_all()
                self.send_json({"dropped": True})
            else:
                self.send_json({"error": "not found"}, 404)

        def stream(self, key):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            q = hub.add(key)
            try:
                with world.lock:
                    first = world.sessions_payload()
                self.wfile.write(f"event: sessions\ndata: {json.dumps(first)}\n\n".encode())
                self.wfile.flush()
                while True:
                    try:
                        item = q.get(timeout=ping)
                    except queue.Empty:
                        item = f"event: ping\ndata: {json.dumps({'now': iso(time.time())})}\n\n"
                    if item is None:
                        break
                    self.wfile.write(item.encode())
                    self.wfile.flush()
            except OSError:
                pass
            finally:
                hub.remove(q)

    return Handler


def serve(port=8765, host="127.0.0.1", speed=1.0, ping=15.0, verbose=False, hold=False):
    t0 = time.time()
    world = build_world(t0)
    hub = Hub()
    spec = json.loads((FIXTURES / "live_script.json").read_text())
    script = Script(world, hub, spec, speed, hold)
    httpd = ThreadingHTTPServer((host, port), make_handler(world, hub, script, ping, verbose))
    httpd.daemon_threads = True
    return httpd, script


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--port", type=int, default=8765, help="0 picks a free port")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--speed", type=float, default=1.0, help="multiply the scripted run's pace")
    ap.add_argument("--ping", type=float, default=15.0, help="seconds between SSE pings")
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--hold", action="store_true", help="play the script only after GET /__mock/start")
    a = ap.parse_args(argv)
    httpd, script = serve(a.port, a.host, a.speed, a.ping, a.verbose, a.hold)
    print(f"observe mock listening on http://{a.host}:{httpd.server_address[1]}/", flush=True)
    script.start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()

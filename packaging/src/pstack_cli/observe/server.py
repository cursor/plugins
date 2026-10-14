"""`pstack serve`: a local, live view of every agent session on this machine. See CONTRACT.md.

One poll thread reads the host session stores and pstack run records; HTTP handler threads answer
the page from the state it holds. Session data stays in memory. No event content is logged.
"""
from __future__ import annotations

import ipaddress
import json
import queue
import secrets
import sys
import threading
import time
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from . import routes as routes_mod
from . import runs as runs_mod
from . import trace as trace_mod
from .lifecycle import register
from .model import SessionState, tool_result_fields
from .readers import READERS

UI = Path(__file__).with_name("ui") / "index.html"
MAX_EVENTS = 3000
POLL = 1.0
DISCOVER_EVERY = 2.0
RUNS_EVERY = 2.0
HOT = 300.0
PING = 15.0
CSP = ("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
       "connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'")


def iso(t: float) -> str:
    return datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Session:
    def __init__(self, ref, reader):
        self.ref, self.reader = ref, reader
        self.key = f"{ref.host}:{ref.id}"
        self.cursor = None
        self.read_mtime = None
        self.state = SessionState(self.key, ref.host)
        self.events = deque(maxlen=MAX_EVENTS)
        self.seq = 0
        self.run_ids = set()
        self.record_paths = set()
        self.cwd = ref.cwd
        self.runs = {}
        self.sent_summary = None
        self.sent_agents = None
        self.state_updated = None
        self.trace_cache = None
        self.trace_key = None


class Hub:
    def __init__(self, home: Path, readers=None, days: float = 14, clock=time.time):
        self.readers = [r(home) if isinstance(r, type) else r for r in (readers or READERS).values()]
        self.days, self.clock = days, clock
        self.sessions = {}
        self.subs = []
        self.lock = threading.RLock()
        self.checker = runs_mod.Checker()
        self._routes = {}
        self._run_files = {}
        self._last_discover = self._last_runs = 0.0
        self.errors = 0

    # ---- subscribers
    def subscribe(self, key=None):
        q = queue.Queue(maxsize=5000)
        with self.lock:
            self.subs.append((q, key))
        return q

    def unsubscribe(self, q):
        with self.lock:
            self.subs = [(s, k) for s, k in self.subs if s is not q]

    def _send(self, name, data, key=None):
        dead = []
        for q, k in self.subs:
            if key is not None and k != key:
                continue
            try:
                q.put_nowait((name, data))
            except queue.Full:
                dead.append(q)
        for q in dead:
            self.unsubscribe(q)

    # ---- polling
    def tick(self):
        t = self.clock()
        with self.lock:
            if t - self._last_discover >= DISCOVER_EVERY:
                self._discover(t)
                self._last_discover = t
            for s in list(self.sessions.values()):
                hot = s.state_updated is not None and t - s.state_updated < HOT
                if s.read_mtime != s.ref.mtime or hot:
                    self._read(s)
                    s.read_mtime = s.ref.mtime
            if t - self._last_runs >= RUNS_EVERY:
                self._runs(t)
                self._last_runs = t
            self._publish(t)

    def _discover(self, t):
        horizon = t - self.days * 86400
        for reader in self.readers:
            try:
                refs = reader.discover()
            except Exception as e:
                self._fault(reader.host, e)
                continue
            for ref in refs:
                if ref.mtime < horizon:
                    continue
                key = f"{ref.host}:{ref.id}"
                s = self.sessions.get(key)
                if s is None:
                    self.sessions[key] = Session(ref, reader)
                else:
                    s.ref = ref

    def _read(self, s):
        try:
            events, s.cursor = s.reader.read(s.ref, s.cursor)
        except Exception as e:
            self._fault(s.ref.host, e)
            return
        for e in events:
            s.seq += 1
            e["seq"] = s.seq
            s.state.apply(e)
            s.events.append(e)
            if e.get("kind") == "session_start" and e.get("cwd"):
                s.cwd = e["cwd"]
            if e.get("kind") == "tool_end":
                metadata = e.get("pstack")
                if metadata is None:
                    metadata = tool_result_fields(e.get("summary"), None)["pstack"]
                s.run_ids.update(metadata["run_ids"])
                s.record_paths.update(metadata["record_paths"])
            self._send("event", {"session": s.key, "event": e}, s.key)
        if events:
            s.state_updated = self.clock()

    def _fault(self, host, e):
        self.errors += 1
        print(f"pstack serve: {host} reader error: {type(e).__name__}", file=sys.stderr)

    def _routes_for(self, cwd):
        if cwd not in self._routes:
            self._routes[cwd] = routes_mod.load(cwd)
        return self._routes[cwd]

    def _runs(self, t):
        by_root = {}
        checkouts = {}
        for s in self.sessions.values():
            roots = set()
            if s.cwd:
                co = runs_mod.checkout(s.cwd)
                if co:
                    checkouts[s.key] = co
                    # A run started anywhere in the repository sits in one of these: the session's
                    # checkout, the record home (the main checkout), or a worktree's.
                    roots |= {d.parent.parent for d in self.checker.record_dirs(co) if d.is_dir()}
            for record_path in s.record_paths:
                path = Path(record_path)
                if path.is_file():
                    roots.add(path.parent.parent.parent)
            for root in roots:
                by_root.setdefault(root, []).append(s)
        for root, members in by_root.items():
            for f in runs_mod.run_files(root):
                try:
                    mtime = f.stat().st_mtime
                except OSError:
                    continue
                cached = self._run_files.get(f)
                if not cached or cached[0] != mtime:
                    rec = runs_mod.load(f)
                    self._run_files[f] = (mtime, rec)
                rec = self._run_files[f][1]
                if not rec:
                    continue
                recorded_session = rec.get("session")
                candidates = members
                if isinstance(recorded_session, dict) and recorded_session.get("id"):
                    key = f"{recorded_session.get('host')}:{recorded_session['id']}"
                    owner = self.sessions.get(key)
                    candidates = [owner] if owner else []
                best = None
                for s in candidates:
                    summ = s.state.summary(t)
                    how = runs_mod.link(rec, summ, "\n".join(f"run {run_id} started" for run_id in s.run_ids))
                    if how == "time" and not runs_mod.same_workspace(rec, root, checkouts.get(s.key)):
                        continue
                    if how:
                        rank = {"session": 0, "output": 1, "time": 2}[how]
                        if best is None or rank < best[0] or (rank == best[0] and (summ.get("started") or "") > (best[2].get("started") or "")):
                            best = (rank, s, summ, how)
                prior = {s.key: s.runs.get(f, {}).get("view") for s in self.sessions.values()}
                for s in self.sessions.values():
                    s.runs.pop(f, None)
                if best:
                    _, s, summ, how = best
                    working = summ.get("state") == "working"
                    check = self.checker.check(root, rec, live=working)
                    v = runs_mod.view(rec, self._routes_for(str(root)), working, check, how)
                    s.runs[f] = {"view": v}
                    if prior.get(s.key) != v:
                        self._send("run", {"session": s.key, "run": v}, s.key)

    def _summary(self, s, t):
        summ = dict(s.state.summary(t))
        views = [r["view"] for r in s.runs.values()]
        latest = max(views, key=lambda v: v.get("created") or "", default=None)
        summ["run"] = runs_mod.summary(latest) if latest else None
        return summ

    def _publish(self, t):
        changed = False
        for s in self.sessions.values():
            summ = self._summary(s, t)
            if summ != s.sent_summary:
                s.sent_summary = summ
                changed = True
            agents = s.state.agents(t)
            if agents != s.sent_agents:
                s.sent_agents = agents
                self._send("agents", {"session": s.key, "agents": agents}, s.key)
        if changed:
            self._send("sessions", self.sessions_payload(t))

    # ---- views
    def sessions_payload(self, t=None):
        t = self.clock() if t is None else t
        with self.lock:
            rows = [s.sent_summary or self._summary(s, t) for s in self.sessions.values()]
        rows.sort(key=lambda r: r.get("updated") or "", reverse=True)
        return {"sessions": rows, "now": iso(t)}

    def session_payload(self, key):
        t = self.clock()
        with self.lock:
            s = self.sessions.get(key)
            if s is None:
                return None
            events = list(s.events)
            agents = s.state.agents(t)
            runs = sorted((r["view"] for r in s.runs.values()), key=lambda v: v.get("created") or "")
            trace_key = (s.seq, tuple((r["id"], len(r.get("transitions", []))) for r in runs), int(t // 5))
            if s.trace_key != trace_key:
                s.trace_cache = trace_mod.build(events, agents, s.cwd, runs, total=s.seq)
                s.trace_key = trace_key
            sources = []
            for i, raw in enumerate(s.ref.paths):
                path = Path(raw)
                try:
                    if path.is_file():
                        sources.append({"id": i, "name": path.name, "path": str(path), "size": path.stat().st_size})
                except OSError:
                    continue
            return {"session": self._summary(s, t), "agents": agents, "events": events,
                    "runs": runs, "trace": s.trace_cache, "sources": sources}

    def source_payload(self, key, index, offset=0):
        with self.lock:
            session = self.sessions.get(key)
            if session is None or index < 0 or index >= len(session.ref.paths) or offset < 0:
                return None
            path = Path(session.ref.paths[index])
        try:
            with path.open("rb") as f:
                f.seek(offset)
                chunk = f.read(65536)
            size = path.stat().st_size
            return {"name": path.name, "offset": offset, "next": offset + len(chunk), "size": size,
                    "text": chunk.decode("utf-8", errors="replace"), "more": offset + len(chunk) < size}
        except OSError:
            return None

    def artifact(self, key, artifact_id):
        payload = self.session_payload(key)
        if payload is None:
            return None
        item = next((a for a in payload["trace"]["artifacts"] if a["id"] == artifact_id and a["previewable"]), None)
        if item is None:
            return None
        path = trace_mod.artifact_path(payload["session"].get("cwd"), item["path"])
        if path is None:
            return None
        try:
            if path.stat().st_size > 32 * 1024 * 1024:
                return None
            return trace_mod.IMAGE_TYPES.get(path.suffix.lower(), "text/plain; charset=utf-8"), path.read_bytes()
        except OSError:
            return None

    def run_forever(self, stop: threading.Event):
        while not stop.is_set():
            try:
                self.tick()
            except Exception as e:
                self._fault("hub", e)
            stop.wait(POLL)


def handler_for(hub: Hub, allowed_hosts: set, shutdown_token: str = None):
    class Handler(BaseHTTPRequestHandler):
        server_version = "pstack-serve"

        def log_message(self, fmt, *args):
            pass

        def _headers(self, code, ctype, extra=None):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            for k, v in (extra or {}).items():
                self.send_header(k, v)

        def _json(self, code, data):
            body = json.dumps(data).encode("utf-8")
            self._headers(code, "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if self.headers.get("Host", "") not in allowed_hosts or self.headers.get("Origin"):
                self._json(403, {"error": "unexpected origin or Host header"})
                return
            if self.path != "/api/shutdown" or shutdown_token is None:
                self._json(404, {"error": "not found"})
                return
            provided = self.headers.get("Authorization", "").encode("utf-8")
            expected = f"Bearer {shutdown_token}".encode("utf-8")
            if not secrets.compare_digest(provided, expected):
                self._json(403, {"error": "invalid shutdown token"})
                return
            self._json(200, {"stopping": True})
            self.wfile.flush()
            self.server.shutdown()

        def do_GET(self):
            # A page on another origin can point a hostname at 127.0.0.1 and read this one.
            # Refusing any Host we did not bind closes that.
            if self.headers.get("Host", "") not in allowed_hosts:
                self._json(403, {"error": "unexpected Host header"})
                return
            url = urlparse(self.path)
            if url.path == "/":
                try:
                    body = UI.read_bytes()
                except OSError:
                    self._json(500, {"error": "ui/index.html is missing from this install"})
                    return
                self._headers(200, "text/html; charset=utf-8", {"Content-Security-Policy": CSP})
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif url.path == "/api/sessions":
                self._json(200, hub.sessions_payload())
            elif url.path.startswith("/api/sessions/"):
                parts = url.path[len("/api/sessions/"):].split("/")
                key = unquote(parts[0])
                if len(parts) == 3 and parts[1] == "sources":
                    try:
                        data = hub.source_payload(key, int(parts[2]), int((parse_qs(url.query).get("offset") or ["0"])[0]))
                    except ValueError:
                        data = None
                    self._json(200, data) if data is not None else self._json(404, {"error": "no such source"})
                elif len(parts) == 3 and parts[1] == "artifacts":
                    artifact = hub.artifact(key, parts[2])
                    if artifact is None:
                        self._json(404, {"error": "artifact unavailable or larger than 32 MiB"})
                        return
                    ctype, body = artifact
                    self._headers(200, ctype, {"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox"})
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                elif len(parts) == 2 and parts[1] == "trace":
                    data = hub.session_payload(key)
                    self._json(200, {"trace": data["trace"], "sources": data["sources"]}) if data else self._json(404, {"error": "unknown session"})
                elif len(parts) == 1:
                    data = hub.session_payload(key)
                    self._json(200, data) if data else self._json(404, {"error": "no such session"})
                else:
                    self._json(404, {"error": "not found"})
            elif url.path == "/api/routes":
                self._json(200, routes_mod.bundled())
            elif url.path == "/api/stream":
                self._stream((parse_qs(url.query).get("session") or [None])[0])
            else:
                self._json(404, {"error": "not found"})

        def _stream(self, key):
            self._headers(200, "text/event-stream", {"Connection": "keep-alive", "X-Accel-Buffering": "no"})
            self.end_headers()
            q = hub.subscribe(key)
            try:
                self._emit("sessions", hub.sessions_payload())
                while True:
                    try:
                        name, data = q.get(timeout=PING)
                    except queue.Empty:
                        name, data = "ping", {"now": iso(time.time())}
                    self._emit(name, data)
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                hub.unsubscribe(q)

        def _emit(self, name, data):
            self.wfile.write(f"event: {name}\ndata: {json.dumps(data)}\n\n".encode("utf-8"))
            self.wfile.flush()

    return Handler


def is_loopback(addr: str) -> bool:
    if addr == "localhost":
        return True
    try:
        return ipaddress.ip_address(addr).is_loopback
    except ValueError:
        return False


def serve(port: int = 7777, bind: str = "127.0.0.1", days: float = 14, open_browser: bool = False,
          home: Path = None) -> int:
    hub = Hub(home or Path.home(), days=days)
    hub.tick()
    try:
        httpd = ThreadingHTTPServer((bind, port), None)
    except OSError as e:
        print(f"pstack serve: cannot listen on {bind}:{port}: {e}", file=sys.stderr)
        return 1
    port = httpd.server_address[1]
    address = httpd.server_address[0]
    control_host = "127.0.0.1" if address == "0.0.0.0" else address
    names = {"127.0.0.1", "localhost", "[::1]", bind, address}
    stop = threading.Event()
    registration = None
    try:
        registration, token = register(control_host, port, home)
        httpd.RequestHandlerClass = handler_for(hub, {f"{n}:{port}" for n in names}, token)
        httpd.daemon_threads = True
        threading.Thread(target=hub.run_forever, args=(stop,), daemon=True).start()
        url = f"http://{control_host}:{port}/"
        print(f"pstack serve: {len(hub.sessions)} session(s) from the last {days:g} days, live at {url}")
        print("  local only: nothing leaves this machine. Ctrl-C or `pstack serve stop` to stop.")
        if open_browser:
            import webbrowser
            webbrowser.open(url)
        httpd.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    except OSError as e:
        print(f"pstack serve: {e}", file=sys.stderr)
        return 1
    finally:
        stop.set()
        httpd.server_close()
        if registration is not None:
            registration.unlink(missing_ok=True)
    print("pstack serve: stopped")
    return 0

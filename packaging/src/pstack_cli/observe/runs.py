"""Run records: find them, link them to sessions, and turn them into the phase view the page draws.

A run record is the file run-record.py keeps at `.pstack/runs/<id>.json`. Its phase marks are the
only authoritative phase states. Nothing here infers a phase from activity.
"""
from __future__ import annotations

import json
import time
import types
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from . import routes as routes_mod

CHECK_EVERY = 15.0


def parse_ts(s: Optional[str]) -> Optional[float]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def iso(t: float) -> str:
    return datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def project_root(cwd: str) -> Optional[Path]:
    """The directory holding `.pstack/runs`: the cwd or its nearest ancestor that has one."""
    p = Path(cwd)
    for d in (p, *p.parents):
        if (d / ".pstack" / "runs").is_dir():
            return d
        if (d / ".git").exists():
            return d if (d / ".pstack" / "runs").is_dir() else None
    return None


def checkout(cwd: str) -> Optional[Path]:
    """The session's checkout: the nearest directory at or above cwd with a .git (a linked worktree
    has a .git file), or, in a project that is not a repository, the one holding .pstack/runs."""
    p = Path(cwd)
    for d in (p, *p.parents):
        if (d / ".git").exists():
            return d
    return project_root(cwd)


def same_workspace(rec: dict, store: Path, checkout_dir: Optional[Path]) -> bool:
    """Time is the weakest link, so it needs the run's workspace to be the session's checkout. A
    record from before workspaces were recorded names none, and the checkout holding it stands in."""
    if checkout_dir is None:
        return False
    path = (rec.get("workspace") or {}).get("path")
    try:
        return Path(path or store).resolve() == checkout_dir.resolve()
    except OSError:
        return False


def run_files(root: Path) -> list:
    d = root / ".pstack" / "runs"
    return sorted(p for p in d.glob("*.json")) if d.is_dir() else []


def load(path: Path) -> Optional[dict]:
    try:
        rec = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return rec if isinstance(rec, dict) and "run" in rec and "phases_required" in rec else None


def link(rec: dict, session: dict, outputs: str) -> Optional[str]:
    """How this run belongs to this session, or None."""
    s = rec.get("session")
    if isinstance(s, dict) and s.get("id"):
        return "session" if s.get("id") == session["id"] and s.get("host") == session["host"] else None
    if f"run {rec['run']} started" in outputs:
        return "output"
    created, started, updated = parse_ts(rec.get("created")), parse_ts(session.get("started")), parse_ts(session.get("updated"))
    if created and started and updated and started - 60 <= created <= updated + 300:
        return "time"
    return None


def _graph(rec: dict, routes: dict):
    route = rec.get("graph") or routes.get(rec["route"])
    required = rec["phases_required"]
    if route and [p["id"] for p in route["phases"]] == list(required):
        return route["title"], [dict(p) for p in route["phases"]], list(route["edges"])
    title = route["title"] if route else rec["route"].replace("-", " ").capitalize()
    known = {p["id"]: p for p in route["phases"]} if route else {}
    phases = [dict(known.get(pid, {"id": pid, "label": f"{i}. {pid}", "step": i}))
              for i, pid in enumerate(required, 1)]
    edges = [{"from": a, "to": b, "kind": "next"} for a, b in zip(required, required[1:])]
    if route:
        ids = set(required)
        edges += [e for e in route["edges"] if e["kind"] == "back" and e["from"] in ids and e["to"] in ids]
    return title, phases, edges


def view(rec: dict, routes: dict, working: bool, check: Optional[dict], linked_by: Optional[str]) -> dict:
    title, phases, edges = _graph(rec, routes)
    order = [p["id"] for p in phases]
    graph = rec.get("graph") or {}
    steps = [dict(p) for p in graph.get("steps", []) if p.get("parent") in order]
    nodes = phases + steps
    marks = {p["id"]: [] for p in nodes}
    path = []
    visited = set()
    for m in sorted(rec.get("phases", []), key=lambda m: m.get("seq", 0)):
        if m.get("name") in marks:
            marks[m["name"]].append({k: m.get(k) for k in
                ("seq", "at", "status", "note", "attempt", "instance", "agent", "parent_instance", "evidence", "tool_ids")})
            key = m.get("instance") or m.get("seq")
            if m["name"] in order and key not in visited:
                path.append(m["name"])
                visited.add(key)
    pause = next((p for p in reversed(rec.get("pauses", [])) if not p.get("resumed")), None)
    active = []
    for p in nodes:
        all_marks = marks[p["id"]]
        ms = all_marks
        if p.get("parent"):
            parent_marks = marks[p["parent"]]
            instance = parent_marks[-1].get("instance") if parent_marks else None
            ms = [m for m in all_marks if instance and m.get("parent_instance") == instance]
        done = {m.get("instance") or m["seq"] for m in all_marks if m["status"] == "done"}
        if not ms:
            p["state"] = "pending"
        elif ms[-1]["status"] == "skip":
            p["state"] = "skipped"
        elif ms[-1]["status"] == "started":
            p["state"] = "paused" if pause else "active"
            if not pause:
                active.append(p["id"])
        elif ms[-1]["status"] in {"failed", "blocked"}:
            p["state"] = ms[-1]["status"]
        elif len(done) > 1:
            p["state"] = "revisited"
        else:
            p["state"] = "done"
        p["marks"] = all_marks
        p["attempt"] = ms[-1].get("attempt") if ms else None
        p["agent"] = ms[-1].get("agent") if ms else None
    current = next((p for p in active if p in order), None)
    explicit = any(m.get("status") == "started" for m in rec.get("phases", []))
    return {
        "id": rec["run"], "route": rec["route"], "route_title": title, "task": rec.get("task", ""),
        "created": rec.get("created"), "linked_by": linked_by, "session": rec.get("session"),
        "workspace": rec.get("workspace"),
        "phases": phases, "steps": steps, "edges": edges, "step_edges": graph.get("step_edges", []),
        "path": path, "current": current, "active": active,
        "tracking": "explicit" if explicit else "completion-only", "transitions": rec.get("transitions", []),
        "check": check or {"complete": False, "problems": ["not checked yet"], "checked_at": None},
        "evidence": [{k: e.get(k) for k in ("seq", "at", "kind", "result", "harness", "command", "output", "phase", "instance", "agent", "tool_ids")}
                     for e in rec.get("evidence", [])],
        "delegates": [{k: d.get(k) for k in ("seq", "at", "job", "status", "role", "model", "budget", "reason", "phase", "instance", "agent_id", "tool_ids", "result")}
                      for d in rec.get("delegates", [])],
        "findings": [{k: f.get(k) for k in ("id", "source", "severity", "status", "summary", "reason")}
                     for f in rec.get("findings", [])],
        "pause": {k: pause.get(k) for k in ("at", "next", "reason", "open_delegates", "phases_reached")} if pause else None,
    }


def summary(v: dict) -> dict:
    done = sum(1 for p in v["phases"] if p["state"] in ("done", "revisited", "skipped"))
    return {"id": v["id"], "route": v["route"], "route_title": v["route_title"], "current": v["current"],
            "done": done, "total": len(v["phases"]), "complete": bool(v["check"].get("complete"))}


class Checker:
    """Runs the project's own `run-record.py` completion check, at most every CHECK_EVERY seconds per run."""

    def __init__(self):
        self._modules = {}
        self._cache = {}
        self._dirs = {}

    def _module(self, cwd: Optional[str]):
        path = routes_mod.script(cwd)
        key = str(path) if path else "<bundled>"
        mod = self._modules.get(key)
        if mod is None:
            source = path.read_bytes() if path else routes_mod.bundled_script()
            if source is None:
                return None
            mod = types.ModuleType("run_record")
            mod.__file__ = str(path) if path else "run-record.py"
            exec(compile(source, mod.__file__, "exec"), mod.__dict__)
            if path is None:
                mod.ROUTE_CATALOG = routes_mod.bundled()
            self._modules[key] = mod
        return mod

    def record_dirs(self, checkout_dir: Path) -> list:
        """Every .pstack/runs directory that can hold this checkout's runs, as the run-record.py this
        project loads reports them: its own, the repository's record home, then each worktree's. A
        run-record.py too old to say gives the checkout's own."""
        key = str(checkout_dir)
        hit = self._dirs.get(key)
        if hit and time.time() - hit[0] < CHECK_EVERY:
            return hit[1]
        mod = self._module(key)
        try:
            dirs = [Path(d) for d in mod.record_dirs(checkout_dir)] if mod and hasattr(mod, "record_dirs") else []
        except Exception:  # it runs git in the user's project; a failure falls back, never raises
            dirs = []
        dirs = dirs or [checkout_dir / ".pstack" / "runs"]
        self._dirs[key] = (time.time(), dirs)
        return dirs

    def check(self, root: Path, rec: dict, live: bool = True) -> dict:
        """`live` rechecks every CHECK_EVERY seconds, since code can change under an unchanged record.
        A finished session's run is rechecked only when its record changes."""
        key = (str(root), rec["run"])
        hit = self._cache.get(key)
        stamp = (rec.get("seq"), len(rec.get("phases", [])))
        if hit and hit[0] == stamp and (not live or time.time() - hit[1] < CHECK_EVERY):
            return hit[2]
        mod = self._module(str(root))
        if mod is None:
            result = {"complete": False, "problems": ["no run-record.py available to check with"], "checked_at": iso(time.time())}
        else:
            try:
                found = mod.problems(root, rec)
                result = {"complete": not found, "problems": found, "checked_at": iso(time.time())}
            except Exception as e:  # the check runs git in the user's project; any failure is reported, not raised
                result = {"complete": False, "problems": [f"check could not run: {e}"], "checked_at": iso(time.time())}
        self._cache[key] = (stamp, time.time(), result)
        return result

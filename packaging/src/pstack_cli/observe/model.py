"""Normalized session events, shared reader helpers, and the liveness reducer.

See CONTRACT.md sections 1-3. Standard library only, Python 3.9+.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

# ---------------------------------------------------------------------------------------------
# Section 2: SessionRef


@dataclass(frozen=True)
class SessionRef:
    host: str
    id: str
    paths: tuple            # every file this session's events come from, main first
    mtime: float            # newest mtime across paths
    cwd: Optional[str]      # when discover can know it cheaply, else None

    @property
    def key(self) -> str:
        return f"{self.host}:{self.id}"


# ---------------------------------------------------------------------------------------------
# Section 1 helpers: timestamps, truncation, event construction

TEXT_LIMIT = 2000
ELLIPSIS = "…"

_ISO_RE = re.compile(
    r"^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?\s*(Z|[+-]\d{2}:?\d{2})?$")


def iso_utc(value: Any) -> Optional[str]:
    """Normalize a host timestamp to ISO 8601 UTC with millisecond precision and a `Z`.

    Accepts ISO strings (with `Z`, an offset, or naive, which is taken as UTC, as SQLite's
    datetime('now') writes) and epoch numbers (seconds, or milliseconds when > 1e11).
    Returns None when the value is not a timestamp.
    """
    epoch = to_epoch(value)
    if epoch is None:
        return None
    dt = datetime.fromtimestamp(epoch, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + "%03dZ" % (dt.microsecond // 1000)


def to_epoch(value: Any) -> Optional[float]:
    """Epoch seconds for an ISO string or epoch number, else None."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        v = float(value)
        if v > 1e11:
            v /= 1000.0
        return v if v > 0 else None
    if not isinstance(value, str):
        return None
    m = _ISO_RE.match(value.strip())
    if not m:
        return None
    y, mo, d, h, mi, s, frac, tz = m.groups()
    try:
        micro = int((frac or "0")[:6].ljust(6, "0"))
        dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s or 0), micro, tzinfo=timezone.utc)
    except ValueError:
        return None
    epoch = dt.timestamp()
    if tz and tz != "Z":
        sign = 1 if tz[0] == "+" else -1
        digits = tz[1:].replace(":", "")
        epoch -= sign * (int(digits[:2]) * 3600 + int(digits[2:]) * 60)
    return epoch


def clip(text: Any, limit: int = TEXT_LIMIT) -> Optional[str]:
    """Truncate to at most `limit` characters, appending `…` when cut. None stays None."""
    if text is None:
        return None
    if not isinstance(text, str):
        text = str(text)
    if len(text) <= limit:
        return text
    return text[:limit - 1] + ELLIPSIS


def one_line(text: Any, limit: int = TEXT_LIMIT) -> Optional[str]:
    """Collapse whitespace so a value reads as a single timeline line, then clip."""
    if text is None:
        return None
    if not isinstance(text, str):
        text = str(text)
    return clip(" ".join(text.split()), limit)


def clip_input(value: Any, _depth: int = 0) -> Dict[str, Any]:
    """A tool input as a dict whose string values are at most 2000 characters each.

    Nested dicts and lists are kept, with their strings clipped; very deep nesting is flattened
    to a clipped JSON string. A non-dict input is wrapped as {"input": value}.
    """
    if not isinstance(value, dict):
        value = {"input": value}
    return {str(k): _clip_value(v, _depth + 1) for k, v in value.items()}


def _clip_value(v: Any, depth: int) -> Any:
    if isinstance(v, str):
        return clip(v)
    if isinstance(v, (int, float, bool)) or v is None:
        return v
    if depth > 4:
        try:
            return clip(json.dumps(v, ensure_ascii=False, default=str))
        except Exception:
            return clip(str(v))
    if isinstance(v, dict):
        return {str(k): _clip_value(x, depth + 1) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_clip_value(x, depth + 1) for x in list(v)[:200]]
    return clip(str(v))


def event(kind: str, ts: str, agent: str, **extra: Any) -> Dict[str, Any]:
    """Build a normalized event, applying the section 1 size limits to text/summary/input."""
    ev: Dict[str, Any] = {"ts": ts, "agent": agent, "kind": kind}
    for k, v in extra.items():
        if k in ("text", "summary"):
            v = clip(v)
        elif k == "input":
            v = clip_input(v if v is not None else {})
        ev[k] = v
    return ev


def notice(ts: str, agent: str, level: str, text: str, **extra: Any) -> Dict[str, Any]:
    return event("notice", ts, agent, level=level, text=text, **extra)


_SUMMARY_KEYS = ("command", "cmd", "file_path", "filePath", "path", "notebook_path", "pattern", "query",
                 "url", "description", "prompt", "skill", "task_name", "target", "message")


def tool_summary(tool: Optional[str], inp: Any) -> Optional[str]:
    """One line a human reads in a timeline: the Bash command, the file path for Read/Edit/Write,
    the pattern for Grep, the description for an Agent spawn; otherwise the first familiar field."""
    name = (tool or "").split("__")[-1]
    if isinstance(inp, str):
        return one_line(inp) or tool
    if not isinstance(inp, dict):
        return tool
    lname = name.lower()
    order: Tuple[str, ...]
    if lname in ("bash", "shell", "exec_command", "run_in_terminal", "powershell"):
        order = ("command", "cmd")
    elif lname in ("read", "edit", "write", "multiedit", "notebookedit", "view", "create", "str_replace"):
        order = ("file_path", "filePath", "path", "notebook_path")
    elif lname in ("grep", "glob", "search"):
        order = ("pattern", "query")
    elif lname in ("agent", "task"):
        order = ("description", "subagent_type")
    elif lname in ("webfetch",):
        order = ("url",)
    elif lname in ("websearch",):
        order = ("query",)
    else:
        order = _SUMMARY_KEYS
    for k in order + _SUMMARY_KEYS:
        v = inp.get(k)
        if isinstance(v, list) and v and all(isinstance(x, str) for x in v):
            v = " ".join(v)
        if isinstance(v, str) and v.strip():
            return one_line(v)
    return tool


_RUN_MARKER = re.compile(
    r"^run ([^\x00-\x1f/\\]+?) started(?:\. Record: ([^\r\n]*?[/\\]\.pstack[/\\]runs[/\\]\1\.json))?", re.M)


def tool_result_fields(output: Any, summary: Optional[str]) -> Dict[str, Any]:
    ids, paths = {}, {}
    pending = [(output, 0)]
    truncated = False
    while pending:
        value, depth = pending.pop()
        if depth > 8:
            truncated = True
            continue
        if isinstance(value, dict):
            pending.extend((value[k], depth + 1) for k in
                           ("output", "content", "text", "result", "value", "resultDetails") if k in value)
        elif isinstance(value, list):
            pending.extend((v, depth + 1) for v in reversed(value))
        elif isinstance(value, str):
            for match in _RUN_MARKER.finditer(value):
                run_id, path = match.groups()
                if len(run_id) > 128:
                    truncated = True
                    continue
                if run_id not in ids:
                    if len(ids) < 64:
                        ids[run_id] = None
                    else:
                        truncated = True
                if path and os.path.isabs(path) and path not in paths:
                    if len(paths) < 64 and len(path) <= 4096:
                        paths[path] = None
                    else:
                        truncated = True
            for line in value.splitlines():
                if line.lstrip().startswith(("{", "[", '"')):
                    try:
                        decoded = json.loads(line)
                    except ValueError:
                        continue
                    if decoded != value:
                        pending.append((decoded, depth + 1))
    return {"summary": summary, "pstack": {
        "run_ids": list(ids), "record_paths": list(paths), "truncated": truncated}}


# ---------------------------------------------------------------------------------------------
# Incremental JSONL reading shared by the line-oriented readers


def read_new_lines(path: str, offset: int, max_bytes: int = 64 * 1024 * 1024) -> Tuple[List[Tuple[int, bytes]], int, bool]:
    """Complete lines appended to `path` since byte `offset`.

    Returns ([(line_start_offset, line_bytes)], new_offset, truncated). A partial last line
    (no trailing newline yet) is not consumed. `truncated` is True when the file shrank below
    `offset`, in which case reading restarts from 0. Missing or unreadable files yield no lines.
    """
    try:
        size = os.path.getsize(path)
    except OSError:
        return [], offset, False
    truncated = False
    if size < offset:
        offset, truncated = 0, True
    if size == offset:
        return [], offset, truncated
    try:
        with open(path, "rb") as fh:
            fh.seek(offset)
            data = fh.read(min(size - offset, max_bytes))
    except OSError:
        return [], offset, truncated
    end = data.rfind(b"\n")
    if end < 0:
        # A single line bigger than max_bytes would never complete; read it whole.
        if size - offset > max_bytes:
            try:
                with open(path, "rb") as fh:
                    fh.seek(offset)
                    data = fh.read()
                end = data.rfind(b"\n")
            except OSError:
                return [], offset, truncated
        if end < 0:
            return [], offset, truncated
    lines: List[Tuple[int, bytes]] = []
    pos = 0
    body = data[:end + 1]
    while pos < len(body):
        nl = body.index(b"\n", pos)
        line = body[pos:nl]
        if line.strip():
            lines.append((offset + pos, line))
        pos = nl + 1
    return lines, offset + end + 1, truncated


def read_first_line(path: str, limit: int = 4 * 1024 * 1024) -> Optional[bytes]:
    """The first complete line of a file, or None if it has none yet."""
    try:
        with open(path, "rb") as fh:
            line = fh.readline(limit)
    except OSError:
        return None
    if not line.endswith(b"\n"):
        return None
    return line


def mtime_of(path: str) -> float:
    try:
        return os.stat(path).st_mtime
    except OSError:
        return 0.0


def sort_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Stable sort by timestamp, so events merged from several files read in time order."""
    return sorted(events, key=lambda e: e.get("ts") or "")


class DirCache:
    """Caches os.scandir listings keyed by the directory's mtime, so discover() stays stat-only."""

    def __init__(self) -> None:
        self._cache: Dict[str, Tuple[int, List[Tuple[str, bool]]]] = {}

    def entries(self, path: str) -> List[Tuple[str, bool]]:
        """[(name, is_dir)] for `path`, or [] when it is missing or unreadable."""
        try:
            st = os.stat(path)
        except OSError:
            self._cache.pop(path, None)
            return []
        hit = self._cache.get(path)
        if hit and hit[0] == st.st_mtime_ns:
            return hit[1]
        out: List[Tuple[str, bool]] = []
        try:
            with os.scandir(path) as it:
                for e in it:
                    try:
                        out.append((e.name, e.is_dir()))
                    except OSError:
                        continue
        except OSError:
            return []
        out.sort()
        self._cache[path] = (st.st_mtime_ns, out)
        return out


# ---------------------------------------------------------------------------------------------
# Section 3: liveness

WORKING_WINDOW = 90.0          # seconds a non-terminal last event keeps an agent working
STALL_AFTER = 600.0            # would-be-working with no event for this long -> stalled
WAITING_WINDOW = 3600.0        # session is `waiting` only while its last event is this recent
# Addition (reported): an agent silent for a day is `idle`, not `stalled` forever. Old sessions
# killed mid-tool would otherwise read as stalled on the dashboard indefinitely.
STALE_HORIZON = 86400.0

# Events that record something about an agent without changing what it is doing.
_PASSIVE = {"usage", "notice", "session_start"}


class _Agent:
    __slots__ = ("id", "parent", "type", "model", "description", "background", "tool_id",
                 "started", "ended", "ok", "events", "last_ts", "last_iso", "last_kind", "open_tools")

    def __init__(self, agent_id: str, parent: Optional[str] = None) -> None:
        self.id = agent_id
        self.parent = parent
        self.type: Optional[str] = None
        self.model: Optional[str] = None
        self.description: Optional[str] = None
        self.background = False
        self.tool_id: Optional[str] = None
        self.started: Optional[str] = None
        self.ended: Optional[str] = None
        self.ok: Optional[bool] = None
        self.events = 0
        self.last_ts: Optional[float] = None
        self.last_iso: Optional[str] = None
        self.last_kind: Optional[str] = None
        self.open_tools: Dict[str, Optional[str]] = {}

    def touch(self, epoch: Optional[float], iso: Optional[str]) -> None:
        if epoch is not None and (self.last_ts is None or epoch >= self.last_ts):
            self.last_ts, self.last_iso = epoch, iso
        if self.started is None and iso is not None:
            self.started = iso


class SessionState:
    """Reduces a session's events (in seq order) to its summary and agent views.

    `now` is epoch seconds (what time.time() returns).
    """

    def __init__(self, key: str, host: str) -> None:
        self.key = key
        self.host = host
        self.id = key.split(":", 1)[1] if ":" in key else key
        self.title: Optional[str] = None
        self.cwd: Optional[str] = None
        self.branch: Optional[str] = None
        self.model: Optional[str] = None
        self.started: Optional[str] = None
        self.updated: Optional[str] = None
        self._first_ts: Optional[float] = None
        self._last_ts: Optional[float] = None
        self.last_prompt: Optional[str] = None
        self._agents: Dict[str, _Agent] = {"main": _Agent("main")}

    # -- reducer --------------------------------------------------------------------------------

    def _agent(self, agent_id: str) -> _Agent:
        a = self._agents.get(agent_id)
        if a is None:
            a = self._agents[agent_id] = _Agent(agent_id, parent="main")
        return a

    def apply(self, ev: Dict[str, Any]) -> None:
        if not isinstance(ev, dict):
            return
        kind = ev.get("kind")
        iso = ev.get("ts") if isinstance(ev.get("ts"), str) else None
        epoch = to_epoch(iso)
        if epoch is not None:
            if self._first_ts is None or epoch < self._first_ts:
                self._first_ts, self.started = epoch, iso
            if self._last_ts is None or epoch >= self._last_ts:
                self._last_ts, self.updated = epoch, iso
        agent = self._agent(str(ev.get("agent") or "main"))
        agent.events += 1
        agent.touch(epoch, iso)
        if kind not in _PASSIVE:
            agent.last_kind = kind

        if kind == "session_start":
            for field in ("cwd", "branch", "model", "title"):
                if ev.get(field):
                    setattr(self, field, ev[field])
            if ev.get("model") and agent.id == "main":
                agent.model = ev["model"]
        elif kind == "prompt":
            if agent.id == "main":
                self.last_prompt = clip(ev.get("text"), 200)
        elif kind == "tool_start":
            agent.open_tools[str(ev.get("id"))] = ev.get("summary") or ev.get("tool")
        elif kind == "tool_end":
            tid = str(ev.get("id"))
            if tid in agent.open_tools:
                agent.open_tools.pop(tid)
            else:
                for other in self._agents.values():
                    if tid in other.open_tools:
                        other.open_tools.pop(tid)
                        break
        elif kind == "turn_end":
            agent.open_tools.clear()
        elif kind == "agent_start":
            sub = self._agent(str(ev.get("agent_id")))
            sub.parent = ev.get("parent") or agent.id
            for field in ("type", "model", "description", "tool_id"):
                if ev.get(field) is not None:
                    setattr(sub, field, ev[field])
            sub.background = bool(ev.get("background"))
            if sub.started is None or (iso and sub.started > iso):
                sub.started = iso
            sub.touch(epoch, iso)
            if sub.last_kind is None:
                sub.last_kind = "agent_start"
        elif kind == "agent_end":
            sub = self._agent(str(ev.get("agent_id")))
            sub.ok = bool(ev.get("ok"))
            sub.ended = iso
            sub.last_kind = "agent_end"
            sub.open_tools.clear()
            sub.touch(epoch, iso)
        elif kind == "usage":
            if ev.get("model"):
                agent.model = ev["model"]
                if agent.id == "main":
                    self.model = ev["model"]
        if kind == "notice" and ev.get("title"):
            self.title = ev["title"]
        if kind in ("session_start", "notice") and ev.get("model") and agent.id == "main":
            self.model = ev["model"]

    # -- views ----------------------------------------------------------------------------------

    def _state(self, a: _Agent, now: float) -> str:
        if a.ok is not None:
            return "done" if a.ok else "failed"
        age = (now - a.last_ts) if a.last_ts is not None else float("inf")
        if age >= STALE_HORIZON:
            return "idle"
        if a.last_kind == "turn_end" and not a.open_tools:
            return "waiting"
        would_work = bool(a.open_tools) or (a.last_kind != "turn_end" and age < WORKING_WINDOW)
        # A subagent (background ones in particular: their spawn returned at once) keeps working
        # until its own agent_end or a final turn in its transcript.
        if a.id != "main" and a.last_kind != "turn_end":
            would_work = True
        if would_work:
            return "stalled" if age >= STALL_AFTER else "working"
        return "idle"

    def agents(self, now: float) -> List[Dict[str, Any]]:
        out = []
        for a in self._agents.values():
            current = None
            if a.open_tools:
                current = list(a.open_tools.values())[-1]
            out.append({
                "id": a.id, "parent": a.parent, "type": a.type,
                "model": a.model if a.id != "main" else (a.model or self.model),
                "description": a.description, "background": a.background,
                "state": self._state(a, now), "started": a.started, "ended": a.ended,
                "events": a.events, "last_activity": a.last_iso, "current": current,
            })
        return out

    def summary(self, now: float) -> Dict[str, Any]:
        views = self.agents(now)
        states = [v["state"] for v in views]
        main_state = views[0]["state"] if views else "idle"
        age = (now - self._last_ts) if self._last_ts is not None else float("inf")
        if "working" in states:
            state = "working"
        elif "stalled" in states:
            state = "stalled"
        elif main_state == "waiting" and age < WAITING_WINDOW:
            state = "waiting"
        else:
            state = "idle"
        return {
            "key": self.key, "host": self.host, "id": self.id, "title": self.title,
            "cwd": self.cwd, "branch": self.branch, "model": self.model,
            "started": self.started, "updated": self.updated, "state": state,
            "last_prompt": self.last_prompt,
            "agents_total": len(views),
            "agents_working": sum(1 for s in states if s == "working"),
            "run": None,
        }


def apply_all(state: SessionState, events: Iterable[Dict[str, Any]]) -> SessionState:
    for ev in events:
        state.apply(ev)
    return state

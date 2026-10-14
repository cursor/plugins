"""GitHub Copilot CLI sessions (built against Copilot CLI 1.0.83).

Two sources, both read-only:

1. ~/.copilot/session-state/<id>/events.jsonl, the session's persisted event journal. The runtime
   documents "a session's persisted events.jsonl file"; the directory layout (workspace.yaml,
   checkpoints/, files/ in session-state/<id>/) was seen on disk, but the only local session never
   authenticated and has no events.jsonl. Each line is a SessionEvent as typed in the CLI's
   copilot-sdk/generated/session-events.d.ts: {id, parentId, timestamp, type, data, agentId?,
   ephemeral?}. ~/.copilot/session-state/<id>.jsonl is the legacy flat transcript, read the same way.
   UNVERIFIED against real rows: every event mapping below comes from the typings, not from data.
       session.start               -> session_start (data.context.cwd/branch, data.selectedModel)
       session.title_changed       -> notice info with `title`
       user.message                -> prompt (data.content; skipped when data.parentAgentTaskId)
       assistant.message           -> message (data.content)
       tool.execution_start        -> tool_start (toolCallId, toolName, arguments)
       tool.execution_complete     -> tool_end (ok = data.success)
       subagent.started            -> agent_start (agent id = data.toolCallId)
       subagent.completed / failed -> agent_end (ok = not cancelled / false)
       assistant.turn_start/turn_end -> turn_end only for a turn that ran no tools (a final answer)
       session.idle                -> turn_end(idle) (ephemeral; may never be persisted)
       abort                       -> notice warn + turn_end(abort)
       assistant.usage             -> usage (inputTokens, outputTokens, cost) (ephemeral)
       session.error / model.call_failure -> notice error; session.warning -> notice warn;
       session.compaction_complete / session.truncation -> notice info; session.shutdown -> turn_end
   Events whose data.parentToolCallId names a started subagent are attributed to that subagent.

2. ~/.copilot/session-store.db (SQLite, schema_version 7), opened with mode=ro. Used for sessions
   that have no events.jsonl. Schemas read with PRAGMA table_info on this machine; all tables were
   empty except one sessions row, so every row mapping is UNVERIFIED:
       sessions(id, cwd, repository, host_type, branch, summary, created_at, updated_at)
                                   -> session_start (summary as title)
       turns(id, session_id, turn_index, user_message, assistant_response, timestamp)
                                   -> prompt, then message + turn_end once assistant_response is set
       assistant_usage_events(id, session_id, model, input_tokens, output_tokens,
                              cache_read_tokens, cache_write_tokens, created_at, ...) -> usage
       checkpoints(id, session_id, checkpoint_number, title, created_at, ...) -> notice info
   SQLite `datetime('now')` values are UTC without a zone and are normalized to Z.
"""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

from ..model import (DirCache, SessionRef, clip, event, iso_utc, mtime_of, notice, one_line,
                     read_new_lines, sort_events, tool_result_fields, tool_summary)


def _parse_yaml(text: str) -> Dict[str, str]:
    """workspace.yaml is flat `key: value` lines; enough of YAML for id, cwd, branch, times."""
    out: Dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.startswith((" ", "\t", "#", "-")) or ":" not in line:
            continue
        k, _, v = line.partition(":")
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
            v = v[1:-1]
        out[k.strip()] = v
    return out


def _connect(db: str) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{quote(db)}?mode=ro", uri=True, timeout=0.5)
    con.row_factory = sqlite3.Row
    return con


class CopilotReader:
    host = "copilot"

    def __init__(self, home: Path):
        self.home = Path(home)
        self.base = self.home / ".copilot"
        self.state_dir = self.base / "session-state"
        self.db = str(self.base / "session-store.db")
        self._dirs = DirCache()
        self._yaml: Dict[str, Tuple[int, Dict[str, str]]] = {}
        self._db_sig: Optional[Tuple[int, int]] = None
        self._db_rows: Dict[str, Dict[str, Any]] = {}

    # -- discover -----------------------------------------------------------------------------

    def _workspace(self, path: str) -> Dict[str, str]:
        try:
            st = os.stat(path)
        except OSError:
            return {}
        hit = self._yaml.get(path)
        if hit and hit[0] == st.st_mtime_ns:
            return hit[1]
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as fh:
                info = _parse_yaml(fh.read())
        except OSError:
            info = {}
        self._yaml[path] = (st.st_mtime_ns, info)
        return info

    def _db_mtime(self) -> float:
        return max(mtime_of(self.db), mtime_of(self.db + "-wal"))

    def _db_sessions(self) -> Dict[str, Dict[str, Any]]:
        """sessions rows, re-queried only when the database or its WAL changed."""
        try:
            sig = (os.stat(self.db).st_mtime_ns, os.stat(self.db + "-wal").st_mtime_ns if os.path.exists(self.db + "-wal") else 0)
        except OSError:
            self._db_rows = {}
            return {}
        if sig == self._db_sig:
            return self._db_rows
        rows: Dict[str, Dict[str, Any]] = {}
        try:
            con = _connect(self.db)
            try:
                for r in con.execute("SELECT id, cwd, branch, summary, created_at, updated_at FROM sessions"):
                    rows[r["id"]] = dict(r)
            finally:
                con.close()
        except sqlite3.Error:
            return self._db_rows  # locked or mid-write: keep the last good answer
        self._db_sig, self._db_rows = sig, rows
        return rows

    def discover(self) -> List[SessionRef]:
        refs: Dict[str, SessionRef] = {}
        has_db = os.path.exists(self.db)
        db_mtime = self._db_mtime() if has_db else 0.0
        sdir = str(self.state_dir)
        for name, is_dir in self._dirs.entries(sdir):
            full = os.path.join(sdir, name)
            if is_dir:
                ws = os.path.join(full, "workspace.yaml")
                info = self._workspace(ws)
                sid = info.get("id") or name
                events = os.path.join(full, "events.jsonl")
                ev_m = mtime_of(events)
                if ev_m:
                    refs[sid] = SessionRef(self.host, sid, (events,), ev_m, info.get("cwd") or None)
                elif has_db or info:
                    paths = (self.db, ws) if has_db else (ws,)
                    refs[sid] = SessionRef(self.host, sid, paths, max(db_mtime, mtime_of(ws)), info.get("cwd") or None)
            elif name.endswith(".jsonl"):
                sid = name[:-len(".jsonl")]
                if sid not in refs:
                    refs[sid] = SessionRef(self.host, sid, (full,), mtime_of(full), None)
        if has_db:
            for sid, row in self._db_sessions().items():
                if sid not in refs:
                    refs[sid] = SessionRef(self.host, sid, (self.db,), db_mtime, row.get("cwd") or None)
        return list(refs.values())

    # -- read ---------------------------------------------------------------------------------

    def read(self, ref: SessionRef, cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        main = ref.paths[0]
        if main.endswith(".jsonl"):
            return self._read_events(ref, main, cursor)
        return self._read_db(ref, cursor)

    # events.jsonl -----------------------------------------------------------------------------

    def _read_events(self, ref: SessionRef, path: str, cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        if isinstance(cursor, dict) and cursor.get("v") == "events":
            cur = dict(cursor)
            for k in ("subagents", "tools_in_turn", "last_kind"):
                cur[k] = dict(cursor[k])
            cur["ended"] = set(cursor["ended"])
        else:
            cur = {"v": "events", "offset": 0, "last_ts": None, "started": False, "subagents": {},
                   "tools_in_turn": {}, "last_kind": {}, "ended": set()}
        out: List[Dict[str, Any]] = []
        lines, new_off, truncated = read_new_lines(path, cur["offset"])
        fallback = cur["last_ts"] or iso_utc(mtime_of(path)) or "1970-01-01T00:00:00.000Z"
        if truncated:
            out.append(notice(fallback, "main", "warn", f"{os.path.basename(path)} shrank; re-reading it"))
        for pos, raw in lines:
            try:
                rec = json.loads(raw)
            except ValueError:
                rec = None
            if not isinstance(rec, dict) or not isinstance(rec.get("type"), str):
                out.append(notice(fallback, "main", "warn",
                                  f"skipped a malformed event in {os.path.basename(path)} at byte {pos}"))
                continue
            try:
                self._event(rec, ref, cur, out)
            except Exception as e:
                out.append(notice(cur["last_ts"] or fallback, "main", "warn",
                                  f"could not interpret a {rec.get('type')} event ({type(e).__name__})"))
        cur["offset"] = new_off
        for ev in out:
            cur["last_kind"][ev["agent"]] = ev["kind"] if ev["kind"] not in ("usage", "notice") else cur["last_kind"].get(ev["agent"])
        return sort_events(out), cur

    def _event(self, rec: Dict[str, Any], ref: SessionRef, cur: Dict[str, Any], out: List[Dict[str, Any]]) -> None:
        t = rec["type"]
        data = rec.get("data") if isinstance(rec.get("data"), dict) else {}
        ts = iso_utc(rec.get("timestamp"))
        if ts:
            cur["last_ts"] = ts
        else:
            ts = cur["last_ts"] or iso_utc(mtime_of(ref.paths[0])) or "1970-01-01T00:00:00.000Z"
        ptc = data.get("parentToolCallId")
        agent = ptc if ptc in cur["subagents"] else "main"
        if not cur["started"] and t != "session.start":
            out.append(event("session_start", ts, "main", cwd=ref.cwd, branch=None, model=None, title=None))
            cur["started"] = True

        if t == "session.start":
            if cur["started"]:
                return
            ctx = data.get("context") if isinstance(data.get("context"), dict) else {}
            out.append(event("session_start", ts, "main", cwd=ctx.get("cwd") or ref.cwd, branch=ctx.get("branch"),
                             model=data.get("selectedModel"), title=None))
            cur["started"] = True
        elif t == "session.title_changed" and data.get("title"):
            out.append(notice(ts, "main", "info", "title: " + str(data["title"]), title=clip(str(data["title"]))))
        elif t == "user.message":
            if data.get("parentAgentTaskId") or agent != "main":
                return
            text = data.get("content")
            if isinstance(text, str) and text.strip():
                out.append(event("prompt", ts, "main", text=text))
        elif t == "assistant.message":
            text = data.get("content")
            if isinstance(text, str) and text.strip():
                out.append(event("message", ts, agent, text=text))
        elif t == "assistant.turn_start":
            cur["tools_in_turn"][agent] = False
        elif t == "tool.execution_start":
            cur["tools_in_turn"][agent] = True
            args = data.get("arguments")
            name = data.get("toolName")
            shell = data.get("shellToolInfo") if isinstance(data.get("shellToolInfo"), dict) else {}
            summary = one_line(shell.get("displayCommand")) or tool_summary(name, args)
            out.append(event("tool_start", ts, agent, id=data.get("toolCallId"), tool=name, summary=summary,
                             input=args if isinstance(args, dict) else {"arguments": args}))
        elif t == "tool.execution_complete":
            err = data.get("error") if isinstance(data.get("error"), dict) else {}
            result = data.get("result")
            summary = err.get("message")
            if summary is None and isinstance(result, dict):
                summary = result.get("content") if isinstance(result.get("content"), str) else None
            out.append(event("tool_end", ts, agent, id=data.get("toolCallId"), ok=bool(data.get("success")),
                             **tool_result_fields(result, one_line((summary or "").split("\n", 1)[0]) or None)))
        elif t == "subagent.started":
            sid = data.get("toolCallId")
            if not sid:
                return
            cur["subagents"][sid] = agent
            out.append(event("agent_start", ts, agent, agent_id=sid, parent=agent,
                             type=data.get("agentName") or data.get("agentType"), model=data.get("model"),
                             description=clip(data.get("agentDescription") or data.get("agentDisplayName")),
                             background=data.get("executionMode") == "background", tool_id=sid))
        elif t in ("subagent.completed", "subagent.failed"):
            sid = data.get("toolCallId")
            if not sid or sid in cur["ended"]:
                return
            cur["ended"].add(sid)
            parent = cur["subagents"].get(sid, "main")
            ok = t == "subagent.completed" and not data.get("cancelled")
            out.append(event("agent_end", ts, parent, agent_id=sid, ok=ok,
                             summary=data.get("error") or ("cancelled" if data.get("cancelled") else "completed")))
        elif t == "assistant.turn_end":
            if not cur["tools_in_turn"].get(agent):
                out.append(event("turn_end", ts, agent, reason="turn_end"))
        elif t == "session.idle":
            if cur["last_kind"].get("main") != "turn_end":
                out.append(event("turn_end", ts, "main", reason="aborted" if data.get("aborted") else "idle"))
        elif t == "abort":
            out.append(notice(ts, agent, "warn", f"aborted: {data.get('reason') or 'by the user'}"))
            out.append(event("turn_end", ts, agent, reason="abort"))
        elif t == "assistant.usage":
            out.append(event("usage", ts, agent, input_tokens=data.get("inputTokens"),
                             output_tokens=data.get("outputTokens"), cost_usd=None,
                             cache_read_tokens=data.get("cacheReadTokens"),
                             cache_write_tokens=data.get("cacheWriteTokens"), model=data.get("model")))
        elif t in ("session.error", "model.call_failure"):
            out.append(notice(ts, agent, "error", str(data.get("message") or data.get("errorType") or t)))
        elif t == "session.warning":
            out.append(notice(ts, agent, "warn", str(data.get("message") or t)))
        elif t == "session.compaction_complete":
            out.append(notice(ts, "main", "info", "context compacted" if data.get("success") else "compaction failed"))
        elif t == "session.truncation":
            out.append(notice(ts, "main", "info", "conversation truncated"))
        elif t == "session.shutdown":
            out.append(notice(ts, "main", "info", "session ended"))
            out.append(event("turn_end", ts, "main", reason="shutdown"))

    # session-store.db ------------------------------------------------------------------------

    def _read_db(self, ref: SessionRef, cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        if isinstance(cursor, dict) and cursor.get("v") == "db":
            cur = dict(cursor)
        else:
            cur = {"v": "db", "started": False, "turn": 0, "prompted": 0, "usage": 0, "ckpt": 0}
        out: List[Dict[str, Any]] = []
        if not os.path.exists(self.db):
            return self._db_session_start_from_yaml(ref, cur, out)
        try:
            con = _connect(self.db)
        except sqlite3.Error:
            return [], cursor if cursor is not None else cur
        try:
            new = dict(cur)
            row = con.execute("SELECT id, cwd, branch, summary, created_at, updated_at FROM sessions WHERE id = ?",
                              (ref.id,)).fetchone()
            if not new["started"]:
                ws = self._workspace(ref.paths[1]) if len(ref.paths) > 1 else {}
                ts = iso_utc(row["created_at"] if row else None) or iso_utc(ws.get("created_at"))
                if ts:
                    out.append(event("session_start", ts, "main",
                                     cwd=(row["cwd"] if row else None) or ws.get("cwd") or ref.cwd,
                                     branch=(row["branch"] if row else None) or ws.get("branch") or None,
                                     model=None, title=(row["summary"] if row else None) or ws.get("name") or None))
                    new["started"] = True
            for t in con.execute("SELECT id, user_message, assistant_response, timestamp FROM turns "
                                 "WHERE session_id = ? AND id > ? ORDER BY id", (ref.id, new["turn"])):
                ts = iso_utc(t["timestamp"]) or "1970-01-01T00:00:00.000Z"
                if t["id"] > new["prompted"]:
                    if t["user_message"]:
                        out.append(event("prompt", ts, "main", text=t["user_message"]))
                    new["prompted"] = t["id"]
                if t["assistant_response"] is None:
                    break  # the turn is still running; its answer is read later
                if t["assistant_response"]:
                    out.append(event("message", ts, "main", text=t["assistant_response"]))
                out.append(event("turn_end", ts, "main", reason="turn_end"))
                new["turn"] = t["id"]
            for u in con.execute("SELECT id, model, input_tokens, output_tokens, cache_read_tokens, "
                                 "cache_write_tokens, created_at FROM assistant_usage_events "
                                 "WHERE session_id = ? AND id > ? ORDER BY id", (ref.id, new["usage"])):
                ts = iso_utc(u["created_at"]) or "1970-01-01T00:00:00.000Z"
                out.append(event("usage", ts, "main", input_tokens=u["input_tokens"], output_tokens=u["output_tokens"],
                                 cost_usd=None, cache_read_tokens=u["cache_read_tokens"],
                                 cache_write_tokens=u["cache_write_tokens"], model=u["model"]))
                new["usage"] = u["id"]
            for c in con.execute("SELECT id, checkpoint_number, title, created_at FROM checkpoints "
                                 "WHERE session_id = ? AND id > ? ORDER BY id", (ref.id, new["ckpt"])):
                ts = iso_utc(c["created_at"]) or "1970-01-01T00:00:00.000Z"
                out.append(notice(ts, "main", "info", f"checkpoint {c['checkpoint_number']}: {c['title'] or ''}".strip()))
                new["ckpt"] = c["id"]
        except sqlite3.Error:
            return [], cursor if cursor is not None else cur  # locked or schema drift: try again later
        finally:
            con.close()
        return sort_events(out), new

    def _db_session_start_from_yaml(self, ref, cur, out):
        if not cur["started"] and len(ref.paths) >= 1 and ref.paths[-1].endswith("workspace.yaml"):
            ws = self._workspace(ref.paths[-1])
            ts = iso_utc(ws.get("created_at"))
            if ts:
                out.append(event("session_start", ts, "main", cwd=ws.get("cwd") or ref.cwd,
                                 branch=ws.get("branch") or None, model=None, title=ws.get("name") or None))
                cur = dict(cur, started=True)
        return out, cur

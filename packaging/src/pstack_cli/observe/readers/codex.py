"""Codex sessions: ~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<thread-id>.jsonl.

Verified against 64 real rollouts (cli_version codex_vscode). Every line is
{timestamp (ISO Z), type, payload, ordinal?}. The first line is `session_meta`.

Subagents are real: a spawned thread gets its own rollout whose session_meta carries
`parent_thread_id`, `source.subagent.thread_spawn{parent_thread_id, depth, agent_path,
agent_nickname, agent_role}` and `subagent_history_start_ordinal`. Records before that ordinal are
the parent's history copied into the fork and are skipped. discover() folds child rollouts into
the root thread's session (paths = root first, then descendants); a subagent's agent id is its
`agent_path` (e.g. "/root/evidence_market"), the value the parent sees in the spawn_agent output
and in SubAgentActivity items. Guardian review threads (source.subagent.other) are modelled the
same way.

Mapping (record -> event):
    session_meta (root)                    -> session_start (cwd, git.branch, model from the first
                                              turn_context)
    session_meta (child)                   -> agent_start if the parent did not already announce it
    response_item message role=user        -> prompt (root thread only; injected blocks such as
                                              <environment_context>, AGENTS.md and IDE context are
                                              dropped; "## My request for Codex:" is kept)
    response_item message role=assistant   -> message (commentary and final_answer)
    response_item function_call / custom_tool_call               -> tool_start
    response_item function_call_output / custom_tool_call_output -> tool_end (ok false on
                                              "Script failed", {"success": false}, a non-zero
                                              metadata.exit_code, or "... failed" from a collab tool)
    spawn_agent output {"task_name": path} -> agent_start (background: spawn returns at once)
    event_msg item_completed SubAgentActivity started|completed|interrupted -> agent_start /
                                              agent_end ok / agent_end not ok
    event_msg task_complete                -> turn_end (plus notice error when `error` is set)
    event_msg turn_aborted                 -> notice warn + turn_end(reason)
    event_msg token_count (info set)       -> usage from last_token_usage, once per total
    event_msg web_search_end               -> tool_start + tool_end (tool "web_search")
    compacted                              -> notice info
Skipped as duplicates of the above: event_msg user_message / agent_message, item_completed
UserMessage / AgentMessage / CommandExecution / FileChange, token_usage_record. Skipped as not
visible: reasoning, world_state, turn_context, thread_settings_applied,
inter_agent_communication_metadata, response_item agent_message (inter-agent mail).
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..model import (DirCache, SessionRef, clip, event, iso_utc, mtime_of, notice, one_line,
                     read_first_line, read_new_lines, sort_events, tool_result_fields, tool_summary)

_UUID = re.compile(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$")
_CMD_IN_CODE = re.compile(r"""\b(?:cmd|command)\s*:\s*(["'`])((?:\\.|(?!\1).)+)\1""", re.S)
_COLLAB_TOOLS = ("spawn_agent", "send_message", "followup_task", "wait_agent", "list_agents", "interrupt_agent")
_IDE_REQUEST = "## My request for Codex:"


def _new_cursor() -> Dict[str, Any]:
    return {"v": 1, "files": {}, "last_ts": {}, "own": {}, "seen_meta": set(), "started": False,
            "started_agents": set(), "ended_agents": set(), "calls": {}, "spawns": {},
            "model": {}, "last_total": {}}


def _copy_cursor(c: Any) -> Dict[str, Any]:
    if not isinstance(c, dict) or c.get("v") != 1:
        return _new_cursor()
    out = dict(c)
    for k in ("files", "last_ts", "own", "calls", "spawns", "model", "last_total"):
        out[k] = dict(c[k])
    for k in ("seen_meta", "started_agents", "ended_agents"):
        out[k] = set(c[k])
    return out


def _output_text(o: Any) -> str:
    if isinstance(o, str):
        return o
    if isinstance(o, list):
        return "\n".join(x.get("text", "") for x in o if isinstance(x, dict) and isinstance(x.get("text"), str))
    if isinstance(o, dict):
        return json.dumps(o)
    return ""


def _first_line(text: str) -> Optional[str]:
    for line in (text or "").splitlines():
        if line.strip():
            return one_line(line)
    return None


def _output_summary(text: str) -> Optional[str]:
    """"Script completed" plus the first line of the script's output, else the first line."""
    if text.startswith("Script "):
        status = text.split("\n", 1)[0].strip()
        i = text.find("Output:\n")
        rest = _first_line(text[i + len("Output:\n"):]) if i >= 0 else None
        return one_line(f"{status}: {rest}" if rest else status)
    return _first_line(text)


def _output_ok(name: Optional[str], text: str) -> bool:
    first = (_first_line(text) or "")
    if first.startswith("Script failed") or first.lower().startswith(("error:", "error ")):
        return False
    s = text.strip()
    if s.startswith("{"):
        try:
            d = json.loads(s)
        except ValueError:
            d = None
        if isinstance(d, dict):
            if d.get("success") is False:
                return False
            meta = d.get("metadata")
            if isinstance(meta, dict) and isinstance(meta.get("exit_code"), int) and meta["exit_code"] != 0:
                return False
    if name in _COLLAB_TOOLS and re.search(r"\bfailed\b", first):
        return False
    return True


def _code_summary(code: str) -> Optional[str]:
    """A readable line for a code-mode `exec` call: the shell command it runs, else its first line."""
    m = _CMD_IN_CODE.search(code or "")
    if m:
        return one_line(m.group(2))
    for line in (code or "").splitlines():
        s = line.strip()
        if s and not s.startswith("//"):
            return one_line(s)
    return one_line(code)


def _prompt_text(content: Any) -> Optional[str]:
    kept: List[str] = []
    images = 0
    for c in content or []:
        if not isinstance(c, dict):
            continue
        if c.get("type") in ("input_image", "image"):
            images += 1
            continue
        t = c.get("text")
        if not isinstance(t, str):
            continue
        s = t.strip()
        if not s:
            continue
        if s.startswith("# Context from my IDE setup"):
            i = s.find(_IDE_REQUEST)
            if i >= 0 and s[i + len(_IDE_REQUEST):].strip():
                kept.append(s[i + len(_IDE_REQUEST):].strip())
            continue
        if s.startswith("<") or s.startswith("# AGENTS.md instructions"):
            continue
        kept.append(t)
    if images:
        kept.append("[image]" if images == 1 else f"[{images} images]")
    text = "\n".join(kept).strip()
    return text or None


class CodexReader:
    host = "codex"

    def __init__(self, home: Path):
        self.home = Path(home)
        self.root = self.home / ".codex" / "sessions"
        self._dirs = DirCache()
        self._meta: Dict[str, Dict[str, Any]] = {}

    # -- discover -----------------------------------------------------------------------------

    def _rollouts(self) -> List[str]:
        out = []
        root = str(self.root)
        for y, yd in self._dirs.entries(root):
            if not yd:
                continue
            for mo, md in self._dirs.entries(os.path.join(root, y)):
                if not md:
                    continue
                for d, dd in self._dirs.entries(os.path.join(root, y, mo)):
                    if not dd:
                        continue
                    ddir = os.path.join(root, y, mo, d)
                    for name, isd in self._dirs.entries(ddir):
                        if not isd and name.startswith("rollout-") and name.endswith(".jsonl"):
                            out.append(os.path.join(ddir, name))
        return out

    def _meta_of(self, path: str) -> Optional[Dict[str, Any]]:
        """session_meta summary for a rollout; read once (first line only) and cached."""
        hit = self._meta.get(path)
        if hit is not None:
            return hit
        line = read_first_line(path)
        if line is None:
            return None
        info: Dict[str, Any] = {}
        try:
            r = json.loads(line)
            pl = r.get("payload") if isinstance(r, dict) and r.get("type") == "session_meta" else None
        except ValueError:
            pl = None
        if isinstance(pl, dict):
            src = pl.get("source") if isinstance(pl.get("source"), dict) else {}
            sub = src.get("subagent") if isinstance(src.get("subagent"), dict) else {}
            spawn = sub.get("thread_spawn") if isinstance(sub.get("thread_spawn"), dict) else {}
            info = {
                "id": pl.get("id") or pl.get("session_id"),
                "parent": pl.get("parent_thread_id") or spawn.get("parent_thread_id"),
                "cwd": pl.get("cwd"),
                "agent_path": pl.get("agent_path") or spawn.get("agent_path"),
                "nickname": pl.get("agent_nickname") or spawn.get("agent_nickname"),
                "role": spawn.get("agent_role") or (sub.get("other") if isinstance(sub.get("other"), str) else None),
                "thread_source": pl.get("thread_source"),
            }
        if not info.get("id"):
            m = _UUID.search(path)
            info["id"] = m.group(1) if m else os.path.basename(path)
        self._meta[path] = info
        return info

    def discover(self) -> List[SessionRef]:
        metas: Dict[str, Dict[str, Any]] = {}
        mtimes: Dict[str, float] = {}
        for path in self._rollouts():
            m = self._meta_of(path)
            if m is None:
                continue
            mt = mtime_of(path)
            if not mt:
                continue
            metas[path] = m
            mtimes[path] = mt
        by_id = {m["id"]: p for p, m in metas.items()}

        def root_of(path: str) -> Tuple[str, int]:
            seen, depth, p = set(), 0, path
            while True:
                parent = metas[p].get("parent")
                if not parent or parent not in by_id or parent in seen or depth > 32:
                    return p, depth
                seen.add(parent)
                p, depth = by_id[parent], depth + 1

        groups: Dict[str, List[Tuple[int, str]]] = {}
        for p in metas:
            root, depth = root_of(p)
            groups.setdefault(root, []).append((depth, p))
        refs = []
        for root, members in groups.items():
            members.sort()
            paths = tuple(p for _, p in members)
            refs.append(SessionRef(self.host, metas[root]["id"], paths, max(mtimes[p] for p in paths),
                                   metas[root].get("cwd")))
        return refs

    # -- read ---------------------------------------------------------------------------------

    def _agent_ids(self, ref: SessionRef) -> Tuple[Dict[str, str], Dict[str, str], Dict[str, str]]:
        """path -> agent id, thread id -> agent id, and path -> parent agent id."""
        path_agent: Dict[str, str] = {}
        thread_agent: Dict[str, str] = {}
        for i, p in enumerate(ref.paths):
            m = self._meta_of(p) or {}
            if i == 0:
                aid = "main"
            else:
                aid = m.get("agent_path") or (f"{m.get('role')}:{str(m.get('id'))[:8]}" if m.get("role") else str(m.get("id")))
            path_agent[p] = aid
            if m.get("id"):
                thread_agent[m["id"]] = aid
        path_parent = {}
        for p in ref.paths[1:]:
            m = self._meta_of(p) or {}
            path_parent[p] = thread_agent.get(m.get("parent"), "main")
        return path_agent, thread_agent, path_parent

    def read(self, ref: SessionRef, cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        cur = _copy_cursor(cursor)
        out: List[Dict[str, Any]] = []
        path_agent, _, path_parent = self._agent_ids(ref)
        for i, path in enumerate(ref.paths):
            self._read_file(path, path_agent[path], i == 0, path_parent.get(path, "main"), cur, out)
        return sort_events(out), cur

    def _read_file(self, path: str, agent: str, is_root: bool, parent: str, cur: Dict[str, Any],
                   out: List[Dict[str, Any]]) -> None:
        offset = cur["files"].get(path, 0)
        lines, new_off, truncated = read_new_lines(path, offset)
        fallback = cur["last_ts"].get(path) or iso_utc(mtime_of(path)) or "1970-01-01T00:00:00.000Z"
        if truncated:
            out.append(notice(fallback, agent, "warn", f"{os.path.basename(path)} shrank; re-reading it"))
        records = []
        for pos, raw in lines:
            try:
                r = json.loads(raw)
            except ValueError:
                r = None
            if not isinstance(r, dict):
                out.append(notice(fallback, agent, "warn",
                                  f"skipped a malformed record in {os.path.basename(path)} at byte {pos}"))
                continue
            records.append(r)
        for r in records:
            try:
                self._record(r, records, path, agent, is_root, parent, cur, out)
            except Exception as e:
                ts = cur["last_ts"].get(path) or fallback
                out.append(notice(ts, agent, "warn", f"could not interpret a {r.get('type')} record ({type(e).__name__})"))
        cur["files"][path] = new_off

    def _record(self, r, batch, path, agent, is_root, parent, cur, out) -> None:
        t = r.get("type")
        pl = r.get("payload") if isinstance(r.get("payload"), dict) else {}
        st = pl.get("type")
        ts = iso_utc(r.get("timestamp"))
        if ts:
            cur["last_ts"][path] = ts
        else:
            ts = cur["last_ts"].get(path) or iso_utc(mtime_of(path)) or "1970-01-01T00:00:00.000Z"

        if t == "session_meta":
            if path in cur["seen_meta"]:
                return  # a forked thread repeats its parent's meta; the first one is its own
            cur["seen_meta"].add(path)
            start = pl.get("subagent_history_start_ordinal")
            cur["own"][path] = start if isinstance(start, int) else None
            model = next((b["payload"].get("model") for b in batch
                          if b.get("type") == "turn_context" and isinstance(b.get("payload"), dict)
                          and b["payload"].get("model")), None)
            ts = iso_utc(pl.get("timestamp")) or ts
            if is_root:
                if not cur["started"]:
                    git = pl.get("git") if isinstance(pl.get("git"), dict) else {}
                    out.append(event("session_start", ts, "main", cwd=pl.get("cwd"), branch=git.get("branch"),
                                     model=model, title=None))
                    cur["started"] = True
            elif agent not in cur["started_agents"]:
                m = self._meta_of(path) or {}
                cur["started_agents"].add(agent)
                out.append(event("agent_start", ts, parent, agent_id=agent, parent=parent,
                                 type=m.get("role") or "subagent", model=model,
                                 description=m.get("nickname") or m.get("agent_path"),
                                 background=True, tool_id=None))
            return

        # Skip history a forked subagent inherited from its parent.
        start = cur["own"].get(path)
        if start is not None:
            ordinal = r.get("ordinal")
            if isinstance(ordinal, int):
                if ordinal < start:
                    return
                cur["own"][path] = None
            else:
                return

        if t == "turn_context":
            if pl.get("model"):
                cur["model"][agent] = pl["model"]
        elif t == "response_item":
            self._response_item(pl, st, ts, agent, is_root, cur, out)
        elif t == "event_msg":
            self._event_msg(pl, st, ts, agent, cur, out)
        elif t == "compacted":
            out.append(notice(ts, agent, "info", "context compacted"))

    def _response_item(self, pl, st, ts, agent, is_root, cur, out) -> None:
        if st == "message":
            role = pl.get("role")
            if role == "user" and is_root:
                text = _prompt_text(pl.get("content"))
                if text:
                    out.append(event("prompt", ts, agent, text=text))
            elif role == "assistant":
                text = "\n".join(c.get("text", "") for c in pl.get("content") or []
                                 if isinstance(c, dict) and c.get("type") in ("output_text", "text")
                                 and isinstance(c.get("text"), str)).strip()
                if text:
                    out.append(event("message", ts, agent, text=text))
        elif st in ("function_call", "custom_tool_call", "local_shell_call"):
            name = pl.get("name") or ("shell" if st == "local_shell_call" else None)
            call_id = pl.get("call_id") or pl.get("id")
            if st == "function_call":
                raw = pl.get("arguments")
                try:
                    inp = json.loads(raw) if isinstance(raw, str) else raw
                except ValueError:
                    inp = {"arguments": raw}
                if not isinstance(inp, dict):
                    inp = {"arguments": raw}
                message = inp.get("message")
                if name in _COLLAB_TOOLS and isinstance(message, str) and re.fullmatch(r"gAAAA[A-Za-z0-9_-]{75,}={0,2}", message):
                    inp["message"] = "[encrypted message]"
                summary = tool_summary(name, inp)
            elif st == "local_shell_call":
                inp = pl.get("action") if isinstance(pl.get("action"), dict) else {}
                summary = tool_summary("shell", inp)
            else:
                inp = {"input": pl.get("input")}
                summary = _code_summary(pl.get("input") or "") if name == "exec" else tool_summary(name, pl.get("input"))
            cur["calls"][call_id] = name
            if name == "spawn_agent":
                description = inp.get("message")
                if description == "[encrypted message]":
                    description = None
                summary = one_line(f"{inp.get('task_name') or 'agent'}: {inp.get('message') or ''}".strip(": "))
                cur["spawns"][call_id] = {"agent": agent, "ts": ts, "model": inp.get("model"),
                                          "type": inp.get("agent_type") or "subagent",
                                          "description": description or inp.get("task_name")}
            out.append(event("tool_start", ts, agent, id=call_id, tool=name, summary=summary, input=inp))
        elif st in ("function_call_output", "custom_tool_call_output"):
            call_id = pl.get("call_id")
            name = cur["calls"].get(call_id) or pl.get("name")
            text = _output_text(pl.get("output"))
            ok = _output_ok(name, text)
            out.append(event("tool_end", ts, agent, id=call_id, ok=ok,
                             **tool_result_fields(pl.get("output"), _output_summary(text))))
            spawn = cur["spawns"].get(call_id)
            if spawn and ok:
                try:
                    d = json.loads(text)
                except ValueError:
                    d = None
                path = d.get("task_name") if isinstance(d, dict) else None
                if isinstance(path, str) and path:
                    self._start_agent(cur, out, path, agent, spawn, call_id, spawn["ts"])

    def _event_msg(self, pl, st, ts, agent, cur, out) -> None:
        if st == "task_complete":
            err = pl.get("error")
            if err:
                msg = err.get("message") if isinstance(err, dict) else str(err)
                out.append(notice(ts, agent, "error", msg or "turn failed"))
            out.append(event("turn_end", ts, agent, reason="error" if err else "task_complete"))
        elif st == "turn_aborted":
            reason = pl.get("reason") or "aborted"
            out.append(notice(ts, agent, "warn", f"turn aborted: {reason}"))
            out.append(event("turn_end", ts, agent, reason=reason))
        elif st == "token_count":
            info = pl.get("info")
            if not isinstance(info, dict):
                return
            last = info.get("last_token_usage") if isinstance(info.get("last_token_usage"), dict) else None
            total = info.get("total_token_usage") if isinstance(info.get("total_token_usage"), dict) else {}
            mark = total.get("total_tokens")
            if last is None or (mark is not None and cur["last_total"].get(agent) == mark):
                return
            cur["last_total"][agent] = mark
            out.append(event("usage", ts, agent, input_tokens=last.get("input_tokens"),
                             output_tokens=last.get("output_tokens"), cost_usd=None,
                             cache_read_tokens=last.get("cached_input_tokens"),
                             reasoning_tokens=last.get("reasoning_output_tokens"),
                             model=cur["model"].get(agent)))
        elif st == "item_completed":
            item = pl.get("item") if isinstance(pl.get("item"), dict) else {}
            if item.get("type") != "SubAgentActivity":
                return
            path = item.get("agent_path")
            if not isinstance(path, str) or not path:
                return
            kind = item.get("kind")
            if kind == "started":
                self._start_agent(cur, out, path, agent, None, None, ts)
            elif kind in ("completed", "interrupted", "errored", "failed", "shutdown"):
                self._start_agent(cur, out, path, agent, None, None, ts)
                if path not in cur["ended_agents"]:
                    cur["ended_agents"].add(path)
                    out.append(event("agent_end", ts, agent, agent_id=path, ok=kind == "completed", summary=kind))
        elif st == "web_search_end":
            call_id = pl.get("call_id")
            q = pl.get("query")
            out.append(event("tool_start", ts, agent, id=call_id, tool="web_search", summary=one_line(q),
                             input={"query": q}))
            out.append(event("tool_end", ts, agent, id=call_id, ok=True, summary=one_line(q)))
        elif st in ("error", "stream_error"):
            msg = pl.get("message") or st
            out.append(notice(ts, agent, "error" if st == "error" else "warn", str(msg)))

    def _start_agent(self, cur, out, aid, parent, spawn, tool_id, ts) -> None:
        if aid in cur["started_agents"]:
            return
        cur["started_agents"].add(aid)
        spawn = spawn or {}
        out.append(event("agent_start", ts, parent, agent_id=aid, parent=parent,
                         type=spawn.get("type") or "subagent", model=spawn.get("model"),
                         description=clip(spawn.get("description") or aid), background=True,
                         tool_id=tool_id))

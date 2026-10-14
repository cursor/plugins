"""Claude Code sessions (CLI and the VS Code extension share this store).

Layout, verified against ~/.claude/projects on a real machine:

    ~/.claude/projects/<slugged-cwd>/<session-id>.jsonl                       main transcript
    ~/.claude/projects/<slugged-cwd>/<session-id>/subagents/agent-<id>.jsonl  one per subagent
    ~/.claude/projects/<slugged-cwd>/<session-id>/subagents/agent-<id>.meta.json
        {agentType, description, toolUseId, model?, spawnDepth, parentAgentId?, stoppedByUser?}

Mapping (record -> event):
    user, origin human or absent, plain text     -> prompt  (IDE context blocks dropped;
                                                    /command wrappers become "/name args")
    user with tool_result blocks                 -> tool_end (ok = not is_error)
    user "[Request interrupted..."               -> notice warn + turn_end(reason interrupted)
    user isMeta / isCompactSummary / origin coordinator|peer -> nothing (injected text)
    user or queued_command "<task-notification>" -> agent_end for the background agent whose
                                                    Agent tool_use id is <tool-use-id>, else a
                                                    notice (background Bash tasks)
    attachment queued_command commandMode=prompt -> prompt (typed while the agent was busy)
    attachment hook_blocking_error / max_turns_reached -> notice warn
    assistant text / tool_use blocks             -> message / tool_start
    assistant tool_use name Agent|Task           -> tool_start + agent_start (linked through
                                                    meta.json toolUseId, or toolUseResult.agentId)
    assistant stop_reason end_turn|stop_sequence|refusal -> turn_end
    assistant message.usage (once per message id, on the record carrying stop_reason) -> usage
    assistant isApiErrorMessage                  -> notice error
    system api_error / compact_boundary          -> notice warn / notice info
    ai-title / custom-title                      -> session_start.title, later changes as a
                                                    notice info carrying a `title` key
Foreground Agent spawns end on their tool_result (toolUseResult.status "completed"); background
spawns return toolUseResult.status "async_launched" at once and end on the task notification.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..model import (DirCache, SessionRef, clip, event, iso_utc, mtime_of, notice, one_line,
                     read_new_lines, sort_events, tool_result_fields, tool_summary)

AGENT_TOOLS = ("Agent", "Task")
TURN_END_STOPS = ("end_turn", "stop_sequence", "refusal")
_TN_TAG = re.compile(r"<(task-id|tool-use-id|status|summary|task-type)>(.*?)</\1>", re.S)
_CMD_NAME = re.compile(r"<command-name>(.*?)</command-name>", re.S)
_CMD_ARGS = re.compile(r"<command-args>(.*?)</command-args>", re.S)
# Blocks the IDE or harness adds around what the human typed.
_CONTEXT_PREFIXES = ("<ide_opened_file>", "<ide_selection>", "<ide_diagnostics>", "<system-reminder>")
# Records that echo local slash-command output rather than a message to the agent.
_LOCAL_PREFIXES = ("<local-command-stdout>", "<local-command-stderr>", "<local-command-caveat>",
                   "<bash-stdout>", "<bash-stderr>", "<bash-input>")
_HEAD_BYTES = 64 * 1024


def _new_cursor() -> Dict[str, Any]:
    return {"v": 1, "files": {}, "last_ts": {}, "started": False, "title": None, "custom_title": False,
            "spawns": {}, "tool_agent": {}, "started_agents": set(), "ended_agents": set(),
            "usage_ids": []}


def _copy_cursor(c: Any) -> Dict[str, Any]:
    if not isinstance(c, dict) or c.get("v") != 1:
        return _new_cursor()
    out = dict(c)
    for k in ("files", "last_ts", "spawns", "tool_agent"):
        out[k] = dict(c[k])
    for k in ("started_agents", "ended_agents"):
        out[k] = set(c[k])
    out["usage_ids"] = list(c["usage_ids"])
    return out


def _text_of(content: Any) -> str:
    """Concatenated text of a message content (string or list of blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for b in content:
            if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str):
                parts.append(b["text"])
            elif isinstance(b, str):
                parts.append(b)
        return "\n".join(parts)
    return ""


def _first_line(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    for line in text.splitlines():
        if line.strip():
            return one_line(line)
    return None


class ClaudeReader:
    host = "claude"

    def __init__(self, home: Path):
        self.home = Path(home)
        self.root = self.home / ".claude" / "projects"
        self._dirs = DirCache()
        self._cwd: Dict[str, Tuple[int, Optional[str]]] = {}
        self._metas: Dict[str, Tuple[int, Dict[str, Any]]] = {}

    # -- discover -----------------------------------------------------------------------------

    def discover(self) -> List[SessionRef]:
        refs: List[SessionRef] = []
        root = str(self.root)
        for proj, is_dir in self._dirs.entries(root):
            if not is_dir:
                continue
            pdir = os.path.join(root, proj)
            entries = self._dirs.entries(pdir)
            dirs = {n for n, d in entries if d}
            for name, is_d in entries:
                if is_d or not name.endswith(".jsonl"):
                    continue
                sid = name[:-len(".jsonl")]
                main = os.path.join(pdir, name)
                try:
                    st = os.stat(main)
                except OSError:
                    continue
                paths = [main]
                mtime = st.st_mtime
                if sid in dirs:
                    subdir = os.path.join(pdir, sid, "subagents")
                    for sname, sd in self._dirs.entries(subdir):
                        if sd or not sname.endswith(".jsonl"):
                            continue
                        sp = os.path.join(subdir, sname)
                        m = mtime_of(sp)
                        if m:
                            paths.append(sp)
                            mtime = max(mtime, m)
                refs.append(SessionRef(self.host, sid, tuple(paths), mtime, self._head_cwd(main, st.st_size)))
        return refs

    def _head_cwd(self, path: str, size: int) -> Optional[str]:
        """cwd from the first records of a transcript; read once and cached."""
        hit = self._cwd.get(path)
        if hit and (hit[1] is not None or hit[0] >= _HEAD_BYTES or hit[0] == size):
            return hit[1]
        cwd = None
        try:
            with open(path, "rb") as fh:
                head = fh.read(_HEAD_BYTES)
            for raw in head.split(b"\n"):
                if b'"cwd"' not in raw:
                    continue
                try:
                    r = json.loads(raw)
                except ValueError:
                    continue
                if isinstance(r, dict) and isinstance(r.get("cwd"), str):
                    cwd = r["cwd"]
                    break
        except OSError:
            pass
        self._cwd[path] = (min(size, _HEAD_BYTES), cwd)
        return cwd

    # -- read ---------------------------------------------------------------------------------

    def read(self, ref: SessionRef, cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        cur = _copy_cursor(cursor)
        out: List[Dict[str, Any]] = []
        by_agent, by_tool = self._load_metas(ref)
        ctx = {"by_agent": by_agent, "by_tool": by_tool}
        for i, path in enumerate(ref.paths):
            if i == 0:
                self._read_file(path, "main", False, cur, out, ctx)
            else:
                base = os.path.basename(path)[:-len(".jsonl")]
                aid = base[len("agent-"):] if base.startswith("agent-") else base
                self._read_file(path, aid, True, cur, out, ctx)
        # Spawns whose meta.json appeared after the spawn record was read.
        for tid, spawn in list(cur["spawns"].items()):
            aid = cur["tool_agent"].get(tid) or by_tool.get(tid)
            if aid and aid not in cur["started_agents"]:
                self._start_agent(cur, out, aid, tid, spawn, by_agent.get(aid), spawn["ts"])
        return sort_events(out), cur

    def _load_metas(self, ref: SessionRef) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, str]]:
        by_agent: Dict[str, Dict[str, Any]] = {}
        by_tool: Dict[str, str] = {}
        for path in ref.paths[1:]:
            base = os.path.basename(path)[:-len(".jsonl")]
            aid = base[len("agent-"):] if base.startswith("agent-") else base
            mpath = path[:-len(".jsonl")] + ".meta.json"
            try:
                st = os.stat(mpath)
            except OSError:
                continue
            hit = self._metas.get(mpath)
            if hit and hit[0] == st.st_mtime_ns:
                meta = hit[1]
            else:
                try:
                    with open(mpath, "rb") as fh:
                        meta = json.loads(fh.read())
                    if not isinstance(meta, dict):
                        meta = {}
                except (OSError, ValueError):
                    continue  # mid-write; retried on the next read
                self._metas[mpath] = (st.st_mtime_ns, meta)
            by_agent[aid] = meta
            if isinstance(meta.get("toolUseId"), str):
                by_tool[meta["toolUseId"]] = aid
        return by_agent, by_tool

    def _read_file(self, path: str, agent: str, is_sub: bool, cur: Dict[str, Any],
                   out: List[Dict[str, Any]], ctx: Dict[str, Any]) -> None:
        offset = cur["files"].get(path, 0)
        lines, new_off, truncated = read_new_lines(path, offset)
        fallback = cur["last_ts"].get(path) or iso_utc(mtime_of(path)) or "1970-01-01T00:00:00.000Z"
        if truncated:
            out.append(notice(fallback, agent, "warn", f"{os.path.basename(path)} shrank; re-reading it"))
        records: List[Dict[str, Any]] = []
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
        if records and is_sub and agent not in cur["started_agents"]:
            first_ts = next((iso_utc(r.get("timestamp")) for r in records if iso_utc(r.get("timestamp"))), fallback)
            meta = ctx["by_agent"].get(agent) or {}
            tid = meta.get("toolUseId")
            self._start_agent(cur, out, agent, tid, cur["spawns"].get(tid), meta, first_ts)
        suppress_title = False
        if not is_sub and not cur["started"] and records:
            suppress_title = self._session_start(records, cur, out)
        for r in records:
            try:
                self._record(r, path, agent, is_sub, cur, out, ctx, suppress_title)
            except Exception as e:  # never let one odd record stop the session
                ts = cur["last_ts"].get(path) or fallback
                out.append(notice(ts, agent, "warn", f"could not interpret a {r.get('type')} record ({type(e).__name__})"))
        cur["files"][path] = new_off

    def _session_start(self, records: List[Dict[str, Any]], cur: Dict[str, Any], out: List[Dict[str, Any]]) -> bool:
        ts = cwd = branch = model = title = None
        custom = False
        for r in records:
            if ts is None:
                ts = iso_utc(r.get("timestamp"))
            if cwd is None and isinstance(r.get("cwd"), str):
                cwd = r["cwd"]
            if branch is None and isinstance(r.get("gitBranch"), str) and r["gitBranch"]:
                branch = r["gitBranch"]
            if model is None and r.get("type") == "assistant":
                m = (r.get("message") or {}).get("model")
                if isinstance(m, str) and not m.startswith("<"):
                    model = m
            if r.get("type") == "custom-title" and r.get("customTitle"):
                title, custom = r["customTitle"], True
            elif r.get("type") == "ai-title" and r.get("aiTitle") and not custom:
                title = r["aiTitle"]
        if ts is None:
            return False  # nothing datable yet; start on a later read
        out.append(event("session_start", ts, "main", cwd=cwd, branch=branch, model=model, title=title))
        cur["started"] = True
        cur["title"] = title
        cur["custom_title"] = custom
        return True

    # -- records ------------------------------------------------------------------------------

    def _record(self, r: Dict[str, Any], path: str, agent: str, is_sub: bool, cur: Dict[str, Any],
                out: List[Dict[str, Any]], ctx: Dict[str, Any], suppress_title: bool) -> None:
        t = r.get("type")
        ts = iso_utc(r.get("timestamp"))
        if ts:
            cur["last_ts"][path] = ts
        else:
            ts = cur["last_ts"].get(path) or iso_utc(mtime_of(path)) or "1970-01-01T00:00:00.000Z"
        if not is_sub and r.get("isSidechain"):
            return  # older builds inlined subagent records in the main file without linkage
        if t == "assistant":
            self._assistant(r, ts, agent, cur, out, ctx)
        elif t == "user":
            self._user(r, ts, agent, is_sub, cur, out, ctx)
        elif t == "attachment":
            self._attachment(r, ts, agent, is_sub, cur, out, ctx)
        elif t == "system":
            self._system(r, ts, agent, out)
        elif t in ("ai-title", "custom-title") and not is_sub:
            if t == "custom-title":
                title = r.get("customTitle")
                cur["custom_title"] = True
            else:
                if cur.get("custom_title"):
                    return
                title = r.get("aiTitle")
            if isinstance(title, str) and title and title != cur.get("title"):
                cur["title"] = title
                if not suppress_title and cur["started"]:
                    out.append(notice(ts, "main", "info", "title: " + title, title=clip(title)))

    def _assistant(self, r, ts, agent, cur, out, ctx) -> None:
        m = r.get("message") if isinstance(r.get("message"), dict) else {}
        if r.get("isApiErrorMessage"):
            text = _text_of(m.get("content")) or str(r.get("error") or "API error")
            out.append(notice(ts, agent, "error", "API error: " + text))
            return
        content = m.get("content")
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        for b in content or []:
            if not isinstance(b, dict):
                continue
            bt = b.get("type")
            if bt == "text":
                text = b.get("text")
                if isinstance(text, str) and text.strip():
                    out.append(event("message", ts, agent, text=text))
            elif bt == "tool_use":
                name = b.get("name")
                inp = b.get("input") if isinstance(b.get("input"), dict) else {}
                tid = b.get("id")
                out.append(event("tool_start", ts, agent, id=tid, tool=name,
                                 summary=tool_summary(name, inp), input=inp))
                if name in AGENT_TOOLS and tid:
                    spawn = {"agent": agent, "ts": ts,
                             "type": inp.get("subagent_type") or "general-purpose",
                             "model": inp.get("model"), "description": inp.get("description"),
                             "background": bool(inp.get("run_in_background"))}
                    cur["spawns"][tid] = spawn
                    aid = ctx["by_tool"].get(tid)
                    if aid:
                        self._start_agent(cur, out, aid, tid, spawn, ctx["by_agent"].get(aid), ts)
        stop = m.get("stop_reason")
        usage = m.get("usage")
        mid = m.get("id")
        if stop and isinstance(usage, dict) and mid not in cur["usage_ids"]:
            cur["usage_ids"].append(mid)
            del cur["usage_ids"][:-256]
            model = m.get("model") if isinstance(m.get("model"), str) and not m["model"].startswith("<") else None
            out.append(event("usage", ts, agent,
                             input_tokens=usage.get("input_tokens"), output_tokens=usage.get("output_tokens"),
                             cost_usd=None, cache_read_tokens=usage.get("cache_read_input_tokens"),
                             cache_write_tokens=usage.get("cache_creation_input_tokens"), model=model))
        if stop == "refusal":
            out.append(notice(ts, agent, "warn", "the model refused"))
        elif stop == "max_tokens":
            out.append(notice(ts, agent, "warn", "response hit the output token limit"))
        if stop in TURN_END_STOPS:
            out.append(event("turn_end", ts, agent, reason=stop))

    def _user(self, r, ts, agent, is_sub, cur, out, ctx) -> None:
        m = r.get("message") if isinstance(r.get("message"), dict) else {}
        c = m.get("content")
        if isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c):
            tur = r.get("toolUseResult")
            for b in c:
                if not isinstance(b, dict):
                    continue
                if b.get("type") == "tool_result":
                    tid = b.get("tool_use_id")
                    err = bool(b.get("is_error"))
                    text = _text_of(b.get("content"))
                    out.append(event("tool_end", ts, agent, id=tid, ok=not err,
                                     **tool_result_fields(b.get("content"), _first_line(text))))
                    if tid in cur["spawns"] or tid in cur["tool_agent"] or tid in ctx["by_tool"]:
                        self._spawn_result(tid, tur if isinstance(tur, dict) else {}, err, text, ts, agent, cur, out, ctx)
                elif b.get("type") == "text" and str(b.get("text", "")).startswith("[Request interrupted"):
                    self._interrupt(ts, agent, out)
            if r.get("toolDenialKind"):
                out.append(notice(ts, agent, "warn", f"permission denied ({r.get('toolDenialKind')})"))
            return
        text = _text_of(c)
        stripped = text.lstrip()
        if stripped.startswith("<task-notification>"):
            self._task_notification(stripped, ts, agent, cur, out, ctx)
            return
        if r.get("isMeta") or r.get("isCompactSummary") or r.get("isVisibleInTranscriptOnly"):
            return
        blocks = c if isinstance(c, list) else [{"type": "text", "text": c if isinstance(c, str) else ""}]
        texts = [b.get("text", "") for b in blocks if isinstance(b, dict) and b.get("type") == "text"]
        if any(isinstance(x, str) and x.startswith("[Request interrupted") for x in texts):
            self._interrupt(ts, agent, out)
            return
        if is_sub:
            return  # a subagent's task comes from its parent, not from the human
        origin = (r.get("origin") or {}).get("kind") if isinstance(r.get("origin"), dict) else None
        if origin not in (None, "human"):
            return
        images = sum(1 for b in blocks if isinstance(b, dict) and b.get("type") == "image")
        prompt = _prompt_text(texts, images)
        if prompt:
            out.append(event("prompt", ts, agent, text=prompt))

    def _interrupt(self, ts, agent, out) -> None:
        out.append(notice(ts, agent, "warn", "interrupted by the user"))
        out.append(event("turn_end", ts, agent, reason="interrupted"))

    def _attachment(self, r, ts, agent, is_sub, cur, out, ctx) -> None:
        a = r.get("attachment") if isinstance(r.get("attachment"), dict) else {}
        at = a.get("type")
        if at == "queued_command":
            p = a.get("prompt")
            ptext = _text_of(p) if not isinstance(p, str) else p
            if ptext.lstrip().startswith("<task-notification>"):
                self._task_notification(ptext.lstrip(), ts, agent, cur, out, ctx)
            elif a.get("commandMode") == "prompt" and not is_sub:
                prompt = _prompt_text([ptext], 0)
                if prompt:
                    out.append(event("prompt", ts, agent, text=prompt))
        elif at == "hook_blocking_error":
            be = a.get("blockingError")
            detail = be.get("blockingError") if isinstance(be, dict) else be
            out.append(notice(ts, agent, "warn", f"hook blocked {a.get('hookEvent') or 'a tool'}: {_first_line(str(detail or '')) or ''}".strip()))
        elif at == "max_turns_reached":
            out.append(notice(ts, agent, "warn", f"max turns reached ({a.get('turnCount')}/{a.get('maxTurns')})"))
        elif at == "task_status":
            status = a.get("status")
            aid = a.get("taskId")
            if aid in ctx["by_agent"] and status in ("completed", "failed", "stopped", "killed"):
                self._end_agent(cur, out, aid, status == "completed", a.get("description") or status, ts, agent)

    def _system(self, r, ts, agent, out) -> None:
        st = r.get("subtype")
        if st == "api_error":
            err = r.get("error") if isinstance(r.get("error"), dict) else {}
            detail = err.get("formatted") or err.get("message") or "API error"
            attempt = f" (retry {r.get('retryAttempt')}/{r.get('maxRetries')})" if r.get("retryAttempt") else ""
            out.append(notice(ts, agent, "warn", f"API error{attempt}: {detail}"))
        elif st == "compact_boundary":
            meta = r.get("compactMetadata") if isinstance(r.get("compactMetadata"), dict) else {}
            pre, post = meta.get("preTokens"), meta.get("postTokens")
            size = f": {pre} -> {post} tokens" if pre is not None and post is not None else ""
            out.append(notice(ts, agent, "info", f"context compacted ({meta.get('trigger') or 'auto'}){size}"))
        elif r.get("level") == "error" and isinstance(r.get("content"), str):
            out.append(notice(ts, agent, "error", r["content"]))

    # -- subagents ----------------------------------------------------------------------------

    def _start_agent(self, cur, out, aid, tid, spawn, meta, ts) -> None:
        if aid in cur["started_agents"]:
            return
        cur["started_agents"].add(aid)
        spawn = spawn or {}
        meta = meta or {}
        parent = spawn.get("agent") or meta.get("parentAgentId") or "main"
        tool_id = tid or meta.get("toolUseId")
        if tool_id:
            cur["tool_agent"][tool_id] = aid
        out.append(event("agent_start", spawn.get("ts") or ts, parent, agent_id=aid, parent=parent,
                         type=spawn.get("type") or meta.get("agentType"),
                         model=spawn.get("model") or meta.get("model"),
                         description=clip(spawn.get("description") or meta.get("description")),
                         background=bool(spawn.get("background")), tool_id=tool_id))

    def _end_agent(self, cur, out, aid, ok, summary, ts, agent) -> None:
        if aid in cur["ended_agents"]:
            return
        cur["ended_agents"].add(aid)
        out.append(event("agent_end", ts, agent, agent_id=aid, ok=bool(ok), summary=summary))

    def _spawn_result(self, tid, tur, err, text, ts, agent, cur, out, ctx) -> None:
        aid = tur.get("agentId") or cur["tool_agent"].get(tid) or ctx["by_tool"].get(tid)
        if not aid:
            return  # the spawn failed before an agent existed; its tool_end says so
        spawn = cur["spawns"].get(tid)
        self._start_agent(cur, out, aid, tid, spawn, ctx["by_agent"].get(aid), spawn["ts"] if spawn else ts)
        status = tur.get("status")
        if status == "async_launched":
            return  # background: completion arrives later as a task notification
        self._end_agent(cur, out, aid, (not err) and status in (None, "completed"), text or status, ts, agent)

    def _task_notification(self, text, ts, agent, cur, out, ctx) -> None:
        tags = dict(_TN_TAG.findall(text))
        tid = tags.get("tool-use-id")
        status = (tags.get("status") or "completed").strip()
        summary = tags.get("summary")
        task_id = tags.get("task-id")
        aid = cur["tool_agent"].get(tid) or ctx["by_tool"].get(tid)
        if not aid and task_id in ctx["by_agent"]:
            aid = task_id
        if aid:
            spawn = cur["spawns"].get(tid)
            self._start_agent(cur, out, aid, tid, spawn, ctx["by_agent"].get(aid), spawn["ts"] if spawn else ts)
            self._end_agent(cur, out, aid, status == "completed", summary or status, ts, agent)
        else:
            out.append(notice(ts, agent, "info", f"background task {status}: {summary or task_id or ''}".strip()))


def _prompt_text(texts: List[Any], images: int) -> Optional[str]:
    """What the human typed, without IDE context blocks; slash commands as "/name args"."""
    kept: List[str] = []
    for t in texts:
        if not isinstance(t, str):
            continue
        s = t.strip()
        if not s:
            continue
        if s.startswith(_LOCAL_PREFIXES):
            return None
        if s.startswith(_CONTEXT_PREFIXES):
            continue
        name = _CMD_NAME.search(s)
        if name and ("<command-message>" in s or s.startswith("<command-name>")):
            args = _CMD_ARGS.search(s)
            cmd = name.group(1).strip()
            if not cmd.startswith("/"):
                cmd = "/" + cmd
            kept.append((cmd + " " + (args.group(1).strip() if args else "")).strip())
            continue
        kept.append(t)
    if images:
        kept.append("[image]" if images == 1 else f"[{images} images]")
    text = "\n".join(kept).strip()
    return text or None

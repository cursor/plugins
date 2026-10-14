"""VS Code chat sessions (GitHub Copilot Chat and other chat participants).

    ~/.config/Code/User/workspaceStorage/<hash>/chatSessions/<session-id>.jsonl   (current)
    ~/.config/Code/User/workspaceStorage/<hash>/chatSessions/<session-id>.json    (older, whole file)
    ~/.config/Code/User/workspaceStorage/<hash>/workspace.json   {"folder"|"workspace"|"file": uri}
    ~/.config/Code/User/globalStorage/emptyWindowChatSessions/<id>.json(l)   (no workspace)

The .jsonl file is a mutation log, verified against 57 real files and VS Code's own serializer
(workbench.desktop.main.js, the `_diffObject` / `_diffArray` producer):
    {"kind": 0, "v": <full session>}            initial snapshot: {sessionId, creationDate (ms),
                                                  requests: [...], customTitle?, ...}
    {"kind": 1, "k": [path...], "v": value}     set the value at path, e.g. ["requests", 2, "result"]
    {"kind": 2, "k": [path...], "v": [...], "i"?} array push at path; with "i", truncate the
                                                  array to length i first (v may then be absent)
    {"kind": 3, "k": [path...]}                 delete at path (not seen in real files; unverified)
A request is {requestId, timestamp (ms), message: {text, parts}, response: [parts], modelId,
modelState: {value, completedAt?}, result?: {errorDetails?, timings, metadata}, elapsedMs?}.
modelState.value: 0 pending, 1 complete, 3 failed (seen, with result.errorDetails); 2 cancelled
is VS Code's enum value but was not seen in real files.

Mapping: request.message.text -> prompt; markdown parts (serialized as {value, ...} without a
kind, or kind "markdownContent") -> message, emitted once a later part follows or the request
completes, consecutive markdown merged; kind "toolInvocationSerialized"/"toolInvocation" ->
tool_start when first seen, tool_end once isComplete (ok false when isConfirmed is false or
resultDetails.isError); toolSpecificData.kind "subagent" -> agent_start/agent_end, and parts
carrying subAgentInvocationId are that subagent's; kind "warning" -> notice warn; completion ->
turn_end (reason complete|cancelled|failed) with a notice error for result.errorDetails.
Tool and subagent parts were not present in this machine's files: that mapping follows VS Code's
serializer code and is unverified against real rows.
Response parts carry no timestamps: they take the request's timestamp; turn_end takes
modelState.completedAt (else timestamp + elapsedMs).
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote, urlparse

from ..model import (DirCache, SessionRef, clip, event, iso_utc, mtime_of, notice, one_line,
                     read_new_lines, sort_events, tool_result_fields)

_STATE_REASON = {1: "complete", 2: "cancelled", 3: "failed"}
_TOOL_KINDS = ("toolInvocationSerialized", "toolInvocation")


def _new_cursor() -> Dict[str, Any]:
    return {"v": 1, "offset": 0, "sig": None, "doc": None, "reqs": {}, "started": False,
            "title": None, "last_ts": None}


def _md_text(p: Any) -> Optional[str]:
    if not isinstance(p, dict):
        return None
    kind = p.get("kind")
    if kind is None and isinstance(p.get("value"), str):
        return p["value"]
    if kind == "markdownContent":
        c = p.get("content")
        if isinstance(c, dict) and isinstance(c.get("value"), str):
            return c["value"]
        if isinstance(c, str):
            return c
    return None


def _msg(v: Any) -> Optional[str]:
    if isinstance(v, str):
        return v
    if isinstance(v, dict) and isinstance(v.get("value"), str):
        return v["value"]
    return None


def _uri_path(uri: Any) -> Optional[str]:
    if not isinstance(uri, str):
        return None
    if uri.startswith("file://"):
        parsed = urlparse(uri)
        path = unquote(parsed.path)
        # Windows: file:///c%3A/x is c:/x, and file://server/share/x is a UNC path.
        if re.match(r"/[A-Za-z]:", path):
            path = path[1:]
        if parsed.netloc and parsed.netloc != "localhost":
            path = f"//{parsed.netloc}{path}"
        return path or None
    return uri


class VSCodeCopilotReader:
    host = "vscode-copilot"

    def __init__(self, home: Path):
        self.home = Path(home)
        # Linux, macOS, then Windows (%APPDATA%, else its default under the profile).
        appdata = os.environ.get("APPDATA")
        bases = [self.home / ".config", self.home / "Library" / "Application Support",
                 Path(appdata) if appdata else self.home / "AppData" / "Roaming"]
        self.users = [b / flavor / "User" for b in bases for flavor in ("Code", "Code - Insiders", "VSCodium")]
        self._dirs = DirCache()
        self._ws: Dict[str, Tuple[int, Optional[str]]] = {}

    # -- discover -----------------------------------------------------------------------------

    def _workspace_cwd(self, hash_dir: str) -> Optional[str]:
        path = os.path.join(hash_dir, "workspace.json")
        try:
            st = os.stat(path)
        except OSError:
            return None
        hit = self._ws.get(path)
        if hit and hit[0] == st.st_mtime_ns:
            return hit[1]
        cwd = None
        try:
            with open(path, "rb") as fh:
                d = json.loads(fh.read())
            if isinstance(d, dict):
                cwd = _uri_path(d.get("folder") or d.get("workspace") or d.get("file"))
        except (OSError, ValueError):
            pass
        self._ws[path] = (st.st_mtime_ns, cwd)
        return cwd

    def _chat_files(self, chat_dir: str) -> Dict[str, str]:
        files: Dict[str, str] = {}
        for name, is_dir in self._dirs.entries(chat_dir):
            if is_dir:
                continue
            if name.endswith(".jsonl"):
                files[name[:-6]] = os.path.join(chat_dir, name)
            elif name.endswith(".json") and name[:-5] not in files:
                files.setdefault(name[:-5], os.path.join(chat_dir, name))
        return files

    def discover(self) -> List[SessionRef]:
        refs: Dict[str, SessionRef] = {}
        for user in self.users:
            ws_root = os.path.join(str(user), "workspaceStorage")
            dirs = [(os.path.join(ws_root, h), True) for h, d in self._dirs.entries(ws_root) if d]
            dirs.append((os.path.join(str(user), "globalStorage", "emptyWindowChatSessions"), False))
            for d, is_ws in dirs:
                chat_dir = os.path.join(d, "chatSessions") if is_ws else d
                files = self._chat_files(chat_dir)
                if not files:
                    continue
                cwd = self._workspace_cwd(d) if is_ws else None
                for sid, path in files.items():
                    mt = mtime_of(path)
                    if mt and (sid not in refs or refs[sid].mtime < mt):
                        refs[sid] = SessionRef(self.host, sid, (path,), mt, cwd)
        return list(refs.values())

    # -- read ---------------------------------------------------------------------------------

    def read(self, ref: SessionRef, cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        # The cursor owns the reconstructed session document, so it is updated in place.
        cur = cursor if isinstance(cursor, dict) and cursor.get("v") == 1 else _new_cursor()
        out: List[Dict[str, Any]] = []
        path = ref.paths[0]
        fallback = cur.get("last_ts") or iso_utc(mtime_of(path)) or "1970-01-01T00:00:00.000Z"
        try:
            if path.endswith(".jsonl"):
                changed = self._apply_log(path, cur, out, fallback)
            else:
                changed = self._load_json(path, cur, out, fallback)
            if changed:
                self._emit(ref, cur, out)
        except Exception as e:
            out.append(notice(fallback, "main", "warn", f"could not interpret {os.path.basename(path)} ({type(e).__name__})"))
        return sort_events(out), cur

    def _apply_log(self, path: str, cur: Dict[str, Any], out: List[Dict[str, Any]], fallback: str) -> bool:
        lines, new_off, truncated = read_new_lines(path, cur["offset"])
        if truncated:
            cur["doc"] = None  # rewritten log; bookkeeping by requestId prevents re-emission
        changed = False
        for pos, raw in lines:
            try:
                rec = json.loads(raw)
            except ValueError:
                rec = None
            if not isinstance(rec, dict) or "kind" not in rec:
                out.append(notice(fallback, "main", "warn",
                                  f"skipped a malformed record in {os.path.basename(path)} at byte {pos}"))
                continue
            try:
                self._mutate(cur, rec)
                changed = True
            except Exception:
                out.append(notice(fallback, "main", "warn",
                                  f"could not apply a kind {rec.get('kind')} record in {os.path.basename(path)} at byte {pos}"))
        cur["offset"] = new_off
        return changed

    @staticmethod
    def _mutate(cur: Dict[str, Any], rec: Dict[str, Any]) -> None:
        kind = rec.get("kind")
        if kind == 0:
            cur["doc"] = rec.get("v") if isinstance(rec.get("v"), dict) else {}
            return
        if cur["doc"] is None:
            cur["doc"] = {}
        k = rec.get("k") or []
        if not isinstance(k, list):
            raise ValueError("bad path")
        if kind == 1 and not k:
            cur["doc"] = rec.get("v") if isinstance(rec.get("v"), dict) else {}
            return
        node: Any = cur["doc"]
        steps = k if kind == 2 else k[:-1]
        for i, key in enumerate(steps):
            nxt_default: Any = [] if (kind == 2 and i == len(steps) - 1) else {}
            if isinstance(node, list):
                node = node[int(key)]
            else:
                if node.get(key) is None:
                    node[key] = nxt_default
                node = node[key]
        if kind == 1:
            last = k[-1]
            if isinstance(node, list):
                idx = int(last)
                if idx == len(node):
                    node.append(rec.get("v"))
                else:
                    node[idx] = rec.get("v")
            else:
                node[last] = rec.get("v")
        elif kind == 2:
            if not isinstance(node, list):
                raise ValueError("push target is not an array")
            if isinstance(rec.get("i"), int):
                del node[rec["i"]:]
            if isinstance(rec.get("v"), list):
                node.extend(rec["v"])
        elif kind == 3:
            last = k[-1]
            if isinstance(node, list):
                del node[int(last)]
            else:
                node.pop(last, None)
        else:
            raise ValueError(f"unknown kind {kind}")

    def _load_json(self, path: str, cur: Dict[str, Any], out: List[Dict[str, Any]], fallback: str) -> bool:
        try:
            st = os.stat(path)
        except OSError:
            return False
        sig = (st.st_size, st.st_mtime_ns)
        if cur["sig"] == sig:
            return False
        cur["sig"] = sig
        try:
            with open(path, "rb") as fh:
                doc = json.loads(fh.read())
        except (OSError, ValueError):
            out.append(notice(fallback, "main", "warn", f"{os.path.basename(path)} is not valid JSON (yet)"))
            return False
        if not isinstance(doc, dict):
            out.append(notice(fallback, "main", "warn", f"{os.path.basename(path)} is not a chat session"))
            return False
        cur["doc"] = doc
        return True

    # -- events -------------------------------------------------------------------------------

    def _emit(self, ref: SessionRef, cur: Dict[str, Any], out: List[Dict[str, Any]]) -> None:
        doc = cur.get("doc")
        if not isinstance(doc, dict):
            return
        requests = [q for q in (doc.get("requests") or []) if isinstance(q, dict)]
        if not cur["started"]:
            ts = iso_utc(doc.get("creationDate")) or (iso_utc(requests[0].get("timestamp")) if requests else None)
            if ts is None:
                ts = iso_utc(mtime_of(ref.paths[0])) or "1970-01-01T00:00:00.000Z"
            model = next((q.get("modelId") for q in requests if q.get("modelId")), None)
            title = doc.get("customTitle") if isinstance(doc.get("customTitle"), str) else None
            out.append(event("session_start", ts, "main", cwd=ref.cwd, branch=None, model=model, title=title))
            cur["started"], cur["title"], cur["last_ts"] = True, title, ts
        elif isinstance(doc.get("customTitle"), str) and doc["customTitle"] != cur.get("title"):
            cur["title"] = doc["customTitle"]
            out.append(notice(cur["last_ts"], "main", "info", "title: " + doc["customTitle"], title=clip(doc["customTitle"])))
        for idx, req in enumerate(requests):
            rid = str(req.get("requestId") or f"#{idx}")
            bk = cur["reqs"].setdefault(rid, {"prompt": False, "parts": 0, "tools": {}, "done": False})
            if bk["done"]:
                continue
            ts = iso_utc(req.get("timestamp")) or cur["last_ts"]
            cur["last_ts"] = max(cur["last_ts"] or ts, ts)
            if not bk["prompt"]:
                msg = req.get("message") if isinstance(req.get("message"), dict) else {}
                text = msg.get("text") if isinstance(msg.get("text"), str) else _msg(req.get("message"))
                if text and text.strip():
                    out.append(event("prompt", ts, "main", text=text))
                bk["prompt"] = True
            parts = req.get("response") if isinstance(req.get("response"), list) else []
            state = req.get("modelState") if isinstance(req.get("modelState"), dict) else {}
            value = state.get("value")
            complete = value in _STATE_REASON or (value is None and (req.get("result") is not None or req.get("isCanceled")))
            j = min(bk["parts"], len(parts))
            while j < len(parts):
                p = parts[j]
                if _md_text(p) is not None:
                    k = j
                    texts = []
                    while k < len(parts) and _md_text(parts[k]) is not None:
                        texts.append(_md_text(parts[k]) or "")
                        k += 1
                    if k == len(parts) and not complete:
                        break  # still streaming; emit once it settles
                    text = "".join(texts).strip()
                    if text:
                        out.append(event("message", ts, "main", text=text))
                    j = k
                    continue
                self._part(p, ts, bk, out)
                j += 1
            bk["parts"] = j
            for p in parts:  # tools already started may have completed since
                if isinstance(p, dict) and p.get("kind") in _TOOL_KINDS:
                    self._tool(p, ts, bk, out)
            if complete:
                end_ts = iso_utc(state.get("completedAt"))
                if end_ts is None and isinstance(req.get("elapsedMs"), (int, float)) and isinstance(req.get("timestamp"), (int, float)):
                    end_ts = iso_utc(req["timestamp"] + req["elapsedMs"])
                end_ts = end_ts or ts
                result = req.get("result") if isinstance(req.get("result"), dict) else {}
                err = result.get("errorDetails") if isinstance(result.get("errorDetails"), dict) else None
                if err:
                    out.append(notice(end_ts, "main", "error", str(err.get("message") or "request failed")))
                reason = _STATE_REASON.get(value) or ("cancelled" if req.get("isCanceled") else "complete")
                if reason == "cancelled":
                    out.append(notice(end_ts, "main", "warn", "request cancelled"))
                out.append(event("turn_end", end_ts, "main", reason=reason))
                bk["done"] = True
                cur["last_ts"] = max(cur["last_ts"], end_ts)

    def _part(self, p: Any, ts: str, bk: Dict[str, Any], out: List[Dict[str, Any]]) -> None:
        if not isinstance(p, dict):
            return
        kind = p.get("kind")
        if kind in _TOOL_KINDS:
            self._tool(p, ts, bk, out)
        elif kind == "warning":
            text = _msg(p.get("content")) or _msg(p.get("value"))
            if text:
                out.append(notice(ts, p.get("subAgentInvocationId") or "main", "warn", text))

    def _tool(self, p: Dict[str, Any], ts: str, bk: Dict[str, Any], out: List[Dict[str, Any]]) -> None:
        tid = p.get("toolCallId")
        if not tid:
            return
        tid = str(tid)
        agent = str(p.get("subAgentInvocationId") or "main")
        if agent == tid:
            agent = "main"
        tsd = p.get("toolSpecificData") if isinstance(p.get("toolSpecificData"), dict) else {}
        is_sub = tsd.get("kind") == "subagent"
        state = bk["tools"].get(tid)
        if state is None:
            summary = None
            cl = tsd.get("commandLine")
            if isinstance(cl, dict):
                summary = cl.get("original") or cl.get("toolEdited") or cl.get("userEdited")
            summary = one_line(summary or _msg(p.get("invocationMessage")) or p.get("toolId"))
            out.append(event("tool_start", ts, agent, id=tid, tool=p.get("toolId"), summary=summary, input=tsd))
            if is_sub:
                out.append(event("agent_start", ts, agent, agent_id=tid, parent=agent,
                                 type=tsd.get("agentName") or "subagent", model=tsd.get("modelName"),
                                 description=clip(tsd.get("description") or _msg(p.get("invocationMessage"))),
                                 background=False, tool_id=tid))
            bk["tools"][tid] = state = False
        if state is False and p.get("isComplete"):
            rd = p.get("resultDetails") if isinstance(p.get("resultDetails"), dict) else {}
            ok = p.get("isConfirmed") is not False and not rd.get("isError")
            summary = one_line(_msg(p.get("pastTenseMessage")) or _msg(p.get("invocationMessage")))
            out.append(event("tool_end", ts, agent, id=tid, ok=ok,
                             **tool_result_fields([rd, tsd.get("output")], summary)))
            if is_sub:
                out.append(event("agent_end", ts, agent, agent_id=tid, ok=ok, summary=summary))
            bk["tools"][tid] = True

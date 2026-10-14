"""References and artifacts observed in session activity. Never infers phase completion."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

REFERENCE = re.compile(r"(?=(?:^|[/\\\s'\"])(skills|playbooks|principles)/([a-z][a-z0-9-]*)(?=/|\.md))")
LINK = re.compile(r"\[([^\]\n]+)\]\(([^)\n]+)\)")
FILE_OPERATION = re.compile(r"\*\*\* (?:Add|Update) File: ([^\n\\]+)")
MANUAL = re.compile(r"(?:[\w./-]+/)?\.pstack/runs/[\w.-]+\.md")
TEXT_EXTENSIONS = {".md", ".txt", ".log", ".json", ".jsonl", ".yaml", ".yml", ".py", ".js", ".mjs",
                   ".ts", ".tsx", ".jsx", ".html", ".css", ".sh", ".toml", ".csv", ".mmd", ".sql"}
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
               ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml"}


def event_text(event):
    parts = [event.get("text") or "", event.get("summary") or ""]
    if event.get("input"):
        parts.append(json.dumps(event["input"], ensure_ascii=False))
    return "\n".join(str(x) for x in parts)


def artifact_path(cwd, raw):
    raw = re.sub(r":\d+(?:-\d+)?$", "", raw).strip("<>")
    if not cwd or re.match(r"^[a-z][a-z0-9+.-]*:", raw, re.I):
        return None
    root = Path(cwd).resolve()
    path = Path(raw)
    path = (path if path.is_absolute() else root / path).resolve()
    if not path.is_relative_to(root):
        return None
    return path


def build(events, agents, cwd, runs, total=None):
    references, artifacts, diagnostics = {}, {}, []
    root = Path(cwd).resolve() if cwd else None
    title = title_source = None
    results = {e.get("id"): e for e in events if e.get("kind") == "tool_end" and e.get("id")}

    def add_artifact(raw, label, event):
        path = artifact_path(cwd, raw)
        if path is None or not path.suffix:
            return
        key = hashlib.sha256(str(path).encode()).hexdigest()[:24]
        item = artifacts.setdefault(key, {"id": key, "path": str(path), "label": label or path.name,
                                         "relative": str(path.relative_to(root)), "seqs": [], "agents": []})
        if event.get("seq") not in item["seqs"]:
            item["seqs"].append(event.get("seq"))
        if event.get("agent") not in item["agents"]:
            item["agents"].append(event.get("agent"))

    for e in events:
        text = event_text(e)
        kind = e.get("kind")
        if kind == "tool_start":
            tool = (e.get("tool") or "").lower()
            if any(word in tool for word in ("read", "exec", "shell", "bash", "search", "grep", "command")):
                for match in REFERENCE.finditer(text):
                    section, name = match.groups()
                    category = {"skills": "skill", "playbooks": "playbook", "principles": "principle"}[section]
                    if name.startswith("principle-"):
                        category = "principle"
                    if name == "pstack-runtime":
                        category = "runtime"
                    key = (category, name, e.get("agent"))
                    item = references.setdefault(key, {"id": f"{category}:{name}:{e.get('agent')}",
                        "kind": category, "name": name, "agent": e.get("agent"), "accesses": [], "source": "tool reference"})
                    result = results.get(e.get("id"))
                    access = {"seq": e.get("seq"), "at": e.get("ts"), "tool_id": e.get("id"),
                              "path": section + "/" + name,
                              "ok": result.get("ok") if result else None}
                    if access not in item["accesses"]:
                        item["accesses"].append(access)
            for match in FILE_OPERATION.finditer(text.replace('\\n', '\n')):
                add_artifact(match.group(1), None, e)
            for match in MANUAL.finditer(text):
                add_artifact(match.group(0), None, e)
        if kind in {"message", "prompt"}:
            for label, path in LINK.findall(e.get("text") or ""):
                add_artifact(path, label, e)
        if kind in {"tool_end", "message"} and re.search(r"not (?:inside|a) (?:a )?git (?:working tree|repository)", text, re.I):
            if not any(d["code"] == "recording-git" for d in diagnostics):
                diagnostics.append({"code": "recording-git", "level": "warn", "title": "A recording attempt required Git",
                    "detail": "This session reported a Git requirement. Updated recorders support plain directories; this historical attempt has no phase record.",
                    "seq": e.get("seq")})
    for item in artifacts.values():
        path = Path(item["path"])
        try:
            item["exists"] = path.is_file()
            item["size"] = path.stat().st_size if item["exists"] else None
        except OSError:
            item["exists"], item["size"] = False, None
        item["kind"] = "image" if path.suffix.lower() in IMAGE_TYPES else "text"
        item["previewable"] = item["exists"] and path.suffix.lower() in TEXT_EXTENSIONS | set(IMAGE_TYPES)
        if title is None and item["relative"].startswith(".pstack/runs/") and path.suffix == ".md" and item["exists"]:
            try:
                with path.open(encoding="utf-8") as f:
                    heading = re.search(r"^#\s+([^\n]+)", f.read(2048))
                if heading:
                    title, title_source = heading.group(1).strip(), item["path"]
            except (OSError, UnicodeError):
                pass
    if not runs:
        diagnostics.insert(0, {"code": "no-phases", "level": "warn", "title": "No explicit phase record is linked",
            "detail": "Execution activity is available. Referenced skills and playbooks do not establish phase starts, completion, or transition reasons."})
    truncated = sum(1 for e in events if (e.get("text") or "").endswith("…") or (e.get("summary") or "").endswith("…"))
    if truncated:
        diagnostics.append({"code": "shortened-text", "level": "info", "title": f"{truncated} activity entries have shortened text",
                            "detail": "Open Source records to inspect the original local logs. Encrypted host fields remain encrypted."})
    if total and total > len(events):
        diagnostics.append({"code": "history-window", "level": "info", "title": f"Showing the latest {len(events)} of {total} observed events",
                            "detail": "Earlier records remain accessible in Source records."})
    return {"title": title, "title_source": title_source, "references": list(references.values()),
            "artifacts": list(artifacts.values()), "diagnostics": diagnostics,
            "coverage": {"events": len(events), "observed": total or len(events), "shortened": truncated,
                         "phase_tracking": "recorded" if runs else "unrecorded", "agents": len(agents)}}

#!/usr/bin/env python3
"""Persist explicitly activated Poteto Mode for one Codex session."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import time
from typing import Any


STATE_VERSION = 1
STATE_TTL_SECONDS = 30 * 24 * 60 * 60
ACTIVATION_PATTERN = re.compile(r"(?<![\w-])\$pstack:poteto-mode(?![\w-])", re.IGNORECASE)
OPT_OUT_PATTERN = re.compile(
    r"(?:"
    r"\b(?:exit|leave|stop|disable)\s+(?:\$pstack:poteto-mode|poteto[ -]mode)\b"
    r"|\bturn\s+off\s+(?:\$pstack:poteto-mode|poteto[ -]mode)\b"
    r"|(?<![\w-])\$pstack:poteto-mode\s+(?:off|stop|disable)\b"
    r")",
    re.IGNORECASE,
)
ACTIVE_CONTEXT = (
    "Poteto Mode is active for this session. Apply $pstack:poteto-mode to non-trivial "
    "engineering work and remain quiet on casual turns. Every pstack child uses "
    "xhigh: Spark for bounded micro-edits, Luna for high-volume evidence work, "
    "Terra for everyday engineering, and Sol for architecture, difficult work, "
    "synthesis, and judging. The parent retains acceptance and external authority."
)


def _read_input() -> dict[str, Any]:
    try:
        value = json.load(__import__("sys").stdin)
    except (json.JSONDecodeError, OSError):
        return {}
    return value if isinstance(value, dict) else {}


def _state_directory() -> Path | None:
    raw = os.environ.get("PLUGIN_DATA")
    if not raw:
        return None
    path = Path(raw) / "poteto-mode"
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    return path


def _state_path(directory: Path, session_id: str) -> Path:
    digest = hashlib.sha256(session_id.encode("utf-8")).hexdigest()
    return directory / f"{digest}.json"


def _load_state(path: Path) -> bool:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return False
    if not isinstance(value, dict) or value.get("version") != STATE_VERSION:
        return False
    updated_at = value.get("updated_at")
    return (
        value.get("active") is True
        and isinstance(updated_at, (int, float))
        and time.time() - updated_at <= STATE_TTL_SECONDS
    )


def _save_state(path: Path, active: bool) -> None:
    payload = {
        "version": STATE_VERSION,
        "active": active,
        "updated_at": int(time.time()),
    }
    file_descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.stem}.",
        suffix=".tmp",
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, separators=(",", ":"))
            handle.write("\n")
        os.chmod(temporary_name, 0o600)
        os.replace(temporary_name, path)
    finally:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass


def _prune(directory: Path) -> None:
    cutoff = time.time() - STATE_TTL_SECONDS
    try:
        candidates = tuple(directory.glob("*.json"))
    except OSError:
        return
    for candidate in candidates:
        try:
            if candidate.stat().st_mtime < cutoff:
                candidate.unlink()
        except (FileNotFoundError, OSError):
            continue


def _emit_context(event_name: str) -> None:
    output = {
        "hookSpecificOutput": {
            "hookEventName": event_name,
            "additionalContext": ACTIVE_CONTEXT,
        }
    }
    print(json.dumps(output, separators=(",", ":")))


def main() -> int:
    event = _read_input()
    event_name = event.get("hook_event_name")
    session_id = event.get("session_id")
    if event_name not in {"UserPromptSubmit", "SessionStart"}:
        return 0
    if not isinstance(session_id, str) or not session_id:
        return 0

    directory = _state_directory()
    if directory is None:
        return 0
    _prune(directory)

    state_path = _state_path(directory, session_id)
    active = _load_state(state_path)
    if event_name == "UserPromptSubmit":
        prompt = event.get("prompt")
        prompt = prompt if isinstance(prompt, str) else ""
        if OPT_OUT_PATTERN.search(prompt):
            active = False
            _save_state(state_path, active=False)
        elif ACTIVATION_PATTERN.search(prompt):
            active = True
            _save_state(state_path, active=True)

    if active:
        _emit_context(event_name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

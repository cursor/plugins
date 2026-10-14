"""The install receipt.

Every file pstack writes is recorded with the hash it had when written. That one
fact is what makes `update` and `uninstall` safe: a file whose hash still matches
is ours to replace or remove, and a file whose hash differs is yours to keep.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Dict, List, Optional

RECEIPT = Path(".pstack") / "receipt.json"


class ReceiptError(Exception):
    """The receipt exists but is not one pstack wrote. Acting on it could remove the wrong files."""


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _texts(v) -> bool:
    return all(isinstance(x, str) for x in v)


def _relative(key: str) -> bool:
    p = PurePosixPath(key)
    return bool(key) and not p.is_absolute() and ".." not in p.parts


BACKUP = re.compile(r"\.pstack/backup-[A-Za-z0-9._-]+")

# Each field's expected shape. A path key must stay inside the project it was loaded from.
SHAPE = {
    "version": ("text", lambda v: isinstance(v, str)),
    "content": ("text", lambda v: isinstance(v, str)),
    "host": ("text", lambda v: isinstance(v, str)),
    "installed": ("text", lambda v: isinstance(v, str)),
    "scope": ("project or user", lambda v: v in ("", "project", "user")),
    "files": ("an object of relative path -> hash",
              lambda v: isinstance(v, dict) and _texts(v.values()) and all(map(_relative, v))),
    "merged": ("an object of relative path -> action",
               lambda v: isinstance(v, dict) and _texts(v.values()) and all(map(_relative, v))),
    # A backup is a directory directly under .pstack/, never the project or anywhere else.
    "backups": ("a list of .pstack/backup-* directories",
                lambda v: isinstance(v, list) and all(isinstance(x, str) and BACKUP.fullmatch(x) for x in v)),
    "reported": ("a list of relative paths", lambda v: isinstance(v, list) and _texts(v) and all(map(_relative, v))),
    "inserted": ("an object of relative path -> list of text",
                 lambda v: isinstance(v, dict) and all(map(_relative, v))
                 and all(isinstance(x, list) and _texts(x) for x in v.values())),
}


@dataclass
class Receipt:
    version: str = ""
    content: str = ""
    host: str = ""
    installed: str = ""
    scope: str = ""  # "user" for `init --user`, whose root is a home directory, not a project
    files: Dict[str, str] = field(default_factory=dict)   # relative path -> sha256 at write time
    merged: Dict[str, str] = field(default_factory=dict)  # memory files we appended to
    backups: list = field(default_factory=list)
    reported: list = field(default_factory=list)  # edited files no longer shipped, already reported
    # instructions file -> the exact text pstack inserted, separator included, oldest first
    inserted: Dict[str, List[str]] = field(default_factory=dict)

    @classmethod
    def load(cls, target: Path) -> Optional["Receipt"]:
        p = target / RECEIPT
        if not p.is_file():
            return None
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
        except (ValueError, OSError) as e:
            raise ReceiptError(f"{p} is not readable JSON ({e})") from None
        if not isinstance(raw, dict):
            raise ReceiptError(f"{p} is not a JSON object")
        for key, (what, ok) in SHAPE.items():
            if key in raw and not ok(raw[key]):
                raise ReceiptError(f"{p}: `{key}` must be {what}")
        fresh = cls()
        return cls(**{k: raw.get(k, getattr(fresh, k)) for k in SHAPE})

    def save(self, target: Path) -> None:
        p = target / RECEIPT
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps({
            "version": self.version, "content": self.content, "host": self.host,
            "installed": self.installed or datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "files": self.files, "merged": self.merged, "backups": self.backups,
            "reported": self.reported, "inserted": self.inserted, "scope": self.scope,
        }, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    def classify(self, target: Path, rel: str) -> str:
        """ours, modified, missing, or foreign."""
        recorded = self.files.get(rel)
        p = target / rel
        if recorded is None:
            return "foreign"
        if not p.is_file():
            return "missing"
        return "ours" if digest(p) == recorded else "modified"

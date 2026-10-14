"""The packaged build store.

Host builds share most of their bytes, so each distinct file is stored once under
its hash and every host carries an index of path -> hash.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterator, Optional

DATA = Path(__file__).parent / "data"


@dataclass
class Build:
    host: str
    index: Dict[str, str]
    exec_paths: frozenset = field(default_factory=frozenset)  # files installed with the exec bit

    @classmethod
    def load(cls, host: str) -> Optional["Build"]:
        p = DATA / "hosts" / f"{host}.json"
        if not p.is_file():
            return None
        ex = DATA / "hosts" / f"{host}.exec"
        execs = frozenset(json.loads(ex.read_text(encoding="utf-8"))) if ex.is_file() else frozenset()
        return cls(host, json.loads(p.read_text(encoding="utf-8")), execs)

    def executable(self, rel: str) -> bool:
        return rel in self.exec_paths

    def content_id(self) -> str:
        """Short digest over this host's index. Changes whenever any shipped file changes."""
        import hashlib
        h = hashlib.sha256()
        for rel in self.paths():
            h.update(rel.encode()); h.update(self.index[rel].encode())
        return h.hexdigest()[:12]

    def blob(self, rel: str) -> Path:
        return DATA / "blobs" / self.index[rel][:2] / self.index[rel]

    def sha(self, rel: str) -> str:
        return self.index[rel]

    def read(self, rel: str) -> bytes:
        return self.blob(rel).read_bytes()

    def paths(self) -> Iterator[str]:
        return iter(sorted(self.index))

    def __contains__(self, rel: str) -> bool:
        return rel in self.index


def available() -> list:
    d = DATA / "hosts"
    return sorted(p.stem for p in d.glob("*.json")) if d.is_dir() else []


def manifest() -> dict:
    p = DATA / "manifest.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else {}

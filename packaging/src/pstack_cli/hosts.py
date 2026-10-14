"""Host registry and detection.

A host is an agent product with its own layout. Everything host-specific in this
package lives here, so adding a host is one entry rather than a hunt.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class Host:
    key: str
    label: str
    skill_dir: str
    agent_dir: str
    runtime_dir: str
    memory: Optional[str]
    tier: int
    invoke: str
    # Files that prove this host is in use, most specific first.
    markers: tuple = field(default_factory=tuple)
    user_markers: tuple = field(default_factory=tuple)
    # Directories that are generically named and must not be merged into $HOME.
    shared_dirs: tuple = ("docs", "automations", "assets")

    def user_root(self, home: Path) -> Path:
        return home / ".cursor" if self.key == "cursor" else home


HOSTS = {
    "claude": Host(
        key="claude", label="Claude Code",
        skill_dir=".claude/skills", agent_dir=".claude/agents",
        runtime_dir=".claude/skills/pstack-runtime", memory="CLAUDE.md", tier=2,
        invoke="/", markers=(".claude", "CLAUDE.md"), user_markers=(".claude",),
    ),
    "codex": Host(
        key="codex", label="Codex CLI",
        skill_dir=".agents/skills", agent_dir=".agents/skills/pstack-runtime/personas",
        runtime_dir=".agents/skills/pstack-runtime", memory="AGENTS.md", tier=2,
        invoke="$", markers=(".agents", ".codex", "AGENTS.md"), user_markers=(".codex", ".agents"),
    ),
    "copilot": Host(
        key="copilot", label="GitHub Copilot",
        skill_dir=".github/skills", agent_dir=".github/agents",
        runtime_dir=".github/skills/pstack-runtime",
        memory=".github/copilot-instructions.md", tier=3,
        invoke="/", markers=(".github/copilot-instructions.md", ".github"),
    ),
    "cursor": Host(
        key="cursor", label="Cursor",
        skill_dir="skills", agent_dir="agents", runtime_dir="skills/pstack-runtime",
        memory=".cursor/rules/pstack.mdc", tier=3,
        invoke="/", markers=(".cursor",), user_markers=(".cursor",),
    ),
    "generic": Host(
        key="generic", label="any agent host",
        skill_dir="pstack/skills", agent_dir="pstack/agents",
        runtime_dir="pstack/runtime", memory="pstack/AGENTS.md", tier=0,
        invoke="", markers=(),
    ),
}

ALIASES = {"claude-code": "claude", "gh-copilot": "copilot", "github-copilot": "copilot"}


def resolve(name: str) -> Host:
    key = ALIASES.get(name, name)
    if key not in HOSTS:
        raise KeyError(name)
    return HOSTS[key]


def detect(target: Path, home: Optional[Path] = None) -> tuple[Host, str, list[str]]:
    """Pick a host for `target`.

    Returns (host, reason, other_candidates). Project markers beat user-level
    config: a repository carrying .agents/ wants the Codex build even on a
    machine where ~/.claude exists.
    """
    home = home or Path(os.path.expanduser("~"))
    project = [h.key for h in HOSTS.values()
               if any((target / m).exists() for m in h.markers)]
    if project:
        return HOSTS[project[0]], "project markers", project[1:]

    user = [h.key for h in HOSTS.values()
            if any((home / m).exists() for m in h.user_markers)]
    if user:
        return HOSTS[user[0]], "your user config (no project markers found)", user[1:]

    return HOSTS["generic"], "nothing detected, falling back to the portable build", []

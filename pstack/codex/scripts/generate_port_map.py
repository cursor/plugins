#!/usr/bin/env python3
"""Generate the frozen upstream-to-Codex file map for the additive port."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


UPSTREAM_COMMIT = "397c8660da6d3d873a91e18c2ca2f22cac1f0ac1"


def _codex_destinations(source: str) -> tuple[list[str], str, str]:
    if source == ".cursor-plugin/plugin.json":
        return (
            ["codex/.codex-plugin/plugin.json"],
            "replaced",
            "Native Codex manifest; Cursor manifest remains unchanged.",
        )
    if source == ".gitignore":
        return (
            [],
            "preserved",
            "Packaging ignore rules remain at the dual-target plugin root.",
        )
    if source == "LICENSE":
        return (
            ["codex/LICENSE"],
            "copied",
            "MIT license retained verbatim in the Codex layer.",
        )
    if source == "README.md":
        return (
            ["README.md", "codex/README.md"],
            "adapted",
            "Root README gains a Codex entry point; the full guide is separate.",
        )
    if source == "agents/comment-sicko.md":
        return (
            [
                "codex/companion/agents/pstack_comment_sicko.toml",
                "codex/skills/no-comments/SKILL.md",
            ],
            "replaced",
            "Procedure is available as a native companion agent and skill flow.",
        )
    if source == "agents/poteto-agent.md":
        return (
            [
                "codex/companion/agents/pstack_poteto.toml",
                "codex/skills/poteto-mode/SKILL.md",
            ],
            "replaced",
            "Procedure is available as a native companion agent and skill flow.",
        )
    if source.startswith("automations/benny/skills/"):
        suffix = source.removeprefix("automations/benny/skills/")
        skill = suffix.split("/", maxsplit=1)[0]
        destinations = [f"codex/automations/benny/skills/{suffix}"]
        if suffix == f"{skill}/SKILL.md":
            destinations.append(f"codex/skills/{suffix}")
        return (
            destinations,
            "adapted",
            "Benny remains a dormant pack and is also discoverable as Codex skills.",
        )
    if source.startswith("automations/"):
        return (
            [f"codex/{source}"],
            "adapted",
            "Cursor automation semantics replaced by authorized Codex cron polling.",
        )
    if source.startswith("docs/"):
        return (
            [f"codex/{source}"],
            "adapted",
            "Guide rewritten for native Codex invocation and runtime surfaces.",
        )
    if source.startswith("skills/"):
        return (
            [f"codex/{source}"],
            "adapted",
            "Skill and colocated resources ported without flattening the tree.",
        )
    raise ValueError(f"unmapped upstream file: {source}")


def _entry(source: str) -> dict[str, Any]:
    destinations, status, note = _codex_destinations(source)
    return {
        "source": source,
        "upstreamDisposition": "preserved",
        "codexDestinations": destinations,
        "status": status,
        "note": note,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "upstream_root",
        type=Path,
        help="Frozen pstack subtree at the commit recorded in UPSTREAM.lock.json.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "PORT-MAP.json",
    )
    arguments = parser.parse_args()

    upstream_root = arguments.upstream_root.resolve()
    sources = sorted(
        path.relative_to(upstream_root).as_posix()
        for path in upstream_root.rglob("*")
        if path.is_file()
        and ".git" not in path.parts
        and path.relative_to(upstream_root).parts[0] != "codex"
    )
    payload = {
        "schemaVersion": 1,
        "upstreamCommit": UPSTREAM_COMMIT,
        "sourceBase": "pstack/",
        "destinationBase": "pstack/",
        "entries": [_entry(source) for source in sources],
    }
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(
        json.dumps(payload, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(sources)} entries to {arguments.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

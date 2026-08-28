#!/usr/bin/env python3
"""Generate native Codex skill metadata from the stable pstack skill set."""

from __future__ import annotations

import json
from pathlib import Path
import re


IMPLICIT_SKILLS = {
    "how",
    "make-bot-ui",
    "setup-pstack",
    "typescript-best-practices",
    "unslop",
    "why",
}
FRONTMATTER_PATTERN = re.compile(r"\A---\n(?P<body>.*?)\n---(?:\n|\Z)", re.DOTALL)


def _frontmatter_value(contents: str, field: str) -> str:
    match = FRONTMATTER_PATTERN.match(contents)
    if match is None:
        raise ValueError("missing frontmatter")
    field_match = re.search(
        rf"(?m)^{re.escape(field)}:\s*(?P<value>.+?)\s*$",
        match.group("body"),
    )
    if field_match is None:
        raise ValueError(f"missing {field}")
    return field_match.group("value").strip().strip('"\'')


def _display_name(name: str) -> str:
    replacements = {"tdd": "TDD", "typescript": "TypeScript"}
    return " ".join(replacements.get(part, part.capitalize()) for part in name.split("-"))


def _short_description(description: str) -> str:
    sentence = description.split(". ", maxsplit=1)[0].rstrip(".")
    if len(sentence) <= 96:
        return sentence
    return sentence[:93].rsplit(" ", maxsplit=1)[0] + "..."


def main() -> int:
    skills_root = Path(__file__).resolve().parents[1] / "skills"
    count = 0
    for skill_file in sorted(skills_root.glob("*/SKILL.md")):
        contents = skill_file.read_text(encoding="utf-8")
        name = _frontmatter_value(contents, "name")
        description = _frontmatter_value(contents, "description")
        lines = [
            "interface:",
            f"  display_name: {json.dumps(_display_name(name))}",
            f"  short_description: {json.dumps(_short_description(description))}",
            f"  default_prompt: {json.dumps(f'Use ${name} for this task.')}",
        ]
        if name not in IMPLICIT_SKILLS:
            lines.extend(
                [
                    "policy:",
                    "  allow_implicit_invocation: false",
                ]
            )
        metadata_path = skill_file.parent / "agents" / "openai.yaml"
        metadata_path.parent.mkdir(parents=True, exist_ok=True)
        metadata_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        count += 1
    print(f"wrote metadata for {count} skills")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

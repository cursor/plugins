#!/usr/bin/env python3
"""Dependency-free static validation for the dual-target pstack package."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from typing import Any
from urllib.parse import unquote, urlparse


EXPECTED_SKILLS = 48
EXPECTED_EXPLICIT_ONLY = 42
EXPECTED_PLAYBOOKS = 23
EXPECTED_UPSTREAM_FILES = 157
NAME_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FRONTMATTER_PATTERN = re.compile(r"\A---\n(?P<body>.*?)\n---(?:\n|\Z)", re.DOTALL)
FORBIDDEN_SKILL_TEXT = {
    "disable-model-invocation": "unsupported Cursor frontmatter",
    "run_in_background": "unsupported Cursor task field",
    "subagent_type": "unsupported Cursor task field",
    "agent-transcripts": "unstable Cursor transcript path",
    ".cursor/skills": "Cursor skill installation path",
    ".cursor/rules": "Cursor rules path",
    "AskQuestion": "Cursor-only interaction primitive",
}
REQUIRED_MODELS = {
    "gpt-5.3-codex-spark",
    "gpt-5.6-luna",
    "gpt-5.6-terra",
    "gpt-5.6-sol",
}
MARKDOWN_LINK_PATTERN = re.compile(r"!?\[[^\]]*\]\((?P<target>[^)]+)\)")
PSTACK_SKILL_REFERENCE_PATTERN = re.compile(r"\$pstack:(?P<name>[a-z0-9-]+)")


class Validation:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def require(self, condition: bool, message: str) -> None:
        if not condition:
            self.errors.append(message)


def _load_json(path: Path, validation: Validation) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError) as error:
        validation.errors.append(f"{path}: cannot parse JSON: {error}")
        return {}
    if not isinstance(value, dict):
        validation.errors.append(f"{path}: expected a JSON object")
        return {}
    return value


def _layout(script_root: Path, validation: Validation) -> tuple[Path, Path, dict[str, Any]]:
    manifest_path = script_root / ".codex-plugin" / "plugin.json"
    if not manifest_path.is_file():
        validation.errors.append("cannot locate .codex-plugin/plugin.json")
        return script_root, script_root, {}
    return script_root, script_root, _load_json(manifest_path, validation)


def _frontmatter(path: Path, validation: Validation) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_PATTERN.match(text)
    if match is None:
        validation.errors.append(f"{path}: missing YAML frontmatter")
        return {}
    result: dict[str, str] = {}
    for line in match.group("body").splitlines():
        if not line or line.startswith((" ", "\t", "#")) or ":" not in line:
            continue
        key, value = line.split(":", maxsplit=1)
        result[key.strip()] = value.strip().strip('"\'')
    return result


def _validate_manifest(
    plugin_root: Path,
    manifest: dict[str, Any],
    validation: Validation,
) -> Path:
    for field in ("name", "version", "description", "author", "license", "skills"):
        validation.require(field in manifest, f"manifest: missing {field}")
    validation.require(manifest.get("name") == "pstack", "manifest: name must be pstack")
    skills_value = manifest.get("skills")
    if not isinstance(skills_value, str):
        validation.errors.append("manifest: skills must be a relative string path")
        return plugin_root / "missing-skills"
    skills_root = (plugin_root / skills_value).resolve()
    try:
        skills_root.relative_to(plugin_root.resolve())
    except ValueError:
        validation.errors.append("manifest: skills path escapes plugin root")
    validation.require(skills_root.is_dir(), f"manifest: skills path does not exist: {skills_root}")
    return skills_root


def _validate_skills(skills_root: Path, validation: Validation) -> None:
    skill_files = sorted(skills_root.glob("*/SKILL.md"))
    validation.require(
        len(skill_files) == EXPECTED_SKILLS,
        f"skills: expected {EXPECTED_SKILLS}, found {len(skill_files)}",
    )
    metadata_count = 0
    explicit_only = 0
    all_text: list[str] = []
    for skill_file in skill_files:
        directory_name = skill_file.parent.name
        metadata = _frontmatter(skill_file, validation)
        name = metadata.get("name", "")
        validation.require(name == directory_name, f"{skill_file}: name must equal {directory_name}")
        validation.require(bool(NAME_PATTERN.fullmatch(name)), f"{skill_file}: invalid skill name")
        validation.require(bool(metadata.get("description")), f"{skill_file}: missing description")

        text = skill_file.read_text(encoding="utf-8")
        all_text.append(text)
        for token, explanation in FORBIDDEN_SKILL_TEXT.items():
            if token in text:
                validation.errors.append(f"{skill_file}: {explanation}: {token}")

        openai_metadata = skill_file.parent / "agents" / "openai.yaml"
        if openai_metadata.is_file():
            metadata_count += 1
            metadata_text = openai_metadata.read_text(encoding="utf-8")
            if (
                re.search(r"(?m)^\s*allow_implicit_invocation:\s*false\s*$", metadata_text)
                is not None
            ):
                explicit_only += 1
    validation.require(
        metadata_count == EXPECTED_SKILLS,
        f"skills: expected metadata for {EXPECTED_SKILLS} skills, found {metadata_count}",
    )
    validation.require(
        explicit_only == EXPECTED_EXPLICIT_ONLY,
        f"skills: expected {EXPECTED_EXPLICIT_ONLY} explicit-only skills, found {explicit_only}",
    )

    combined = "\n".join(all_text)
    for model in REQUIRED_MODELS:
        validation.require(model in combined, f"skills: model routing never names {model}")
    validation.require("xhigh" in combined, "skills: model routing never requires xhigh")

    playbooks = sorted((skills_root / "poteto-mode" / "playbooks").glob("*.md"))
    validation.require(
        len(playbooks) == EXPECTED_PLAYBOOKS,
        f"playbooks: expected {EXPECTED_PLAYBOOKS}, found {len(playbooks)}",
    )


def _validate_agents(codex_root: Path, validation: Validation) -> None:
    agents_root = codex_root / "companion" / "agents"
    agent_files = sorted(agents_root.glob("*.toml"))
    validation.require(len(agent_files) == 6, f"agents: expected 6 profiles, found {len(agent_files)}")
    for agent_file in agent_files:
        try:
            text = agent_file.read_text(encoding="utf-8")
        except OSError as error:
            validation.errors.append(f"{agent_file}: cannot read TOML: {error}")
            continue
        for field in ("name", "description", "developer_instructions", "model"):
            validation.require(
                re.search(
                    rf'(?ms)^{re.escape(field)}\s*=\s*(?:"[^"\n]+"|""".+?""")\s*$',
                    text,
                )
                is not None,
                f"{agent_file}: missing or empty {field}",
            )
        validation.require(
            re.search(r'(?m)^model_reasoning_effort\s*=\s*"xhigh"\s*$', text)
            is not None,
            f"{agent_file}: model_reasoning_effort must be xhigh",
        )


def _validate_hooks(plugin_root: Path, codex_root: Path, validation: Validation) -> None:
    hooks_root = plugin_root / "hooks"
    if not hooks_root.is_dir():
        hooks_root = codex_root / "hooks"
    hooks = _load_json(hooks_root / "hooks.json", validation)
    events = hooks.get("hooks", {})
    validation.require(isinstance(events, dict), "hooks: hooks must be an object")
    if isinstance(events, dict):
        validation.require("UserPromptSubmit" in events, "hooks: missing UserPromptSubmit")
        validation.require("SessionStart" in events, "hooks: missing SessionStart")
    validation.require((hooks_root / "poteto_mode.py").is_file(), "hooks: missing poteto_mode.py")


def _validate_markdown_links(codex_root: Path, validation: Validation) -> None:
    for markdown_file in sorted(codex_root.rglob("*.md")):
        if "node_modules" in markdown_file.parts:
            continue
        contents = markdown_file.read_text(encoding="utf-8")
        for match in MARKDOWN_LINK_PATTERN.finditer(contents):
            raw_target = match.group("target").strip()
            if raw_target.startswith("<") and raw_target.endswith(">"):
                raw_target = raw_target[1:-1]
            raw_target = raw_target.split(' "', maxsplit=1)[0]
            parsed = urlparse(raw_target)
            if parsed.scheme or raw_target.startswith(("#", "mailto:")):
                continue
            relative_path = unquote(parsed.path)
            if not relative_path:
                continue
            target = (markdown_file.parent / relative_path).resolve()
            try:
                target.relative_to(codex_root.resolve())
            except ValueError:
                validation.errors.append(
                    f"{markdown_file}: relative link escapes Codex root: {raw_target}"
                )
                continue
            validation.require(
                target.exists(),
                f"{markdown_file}: missing relative link target: {raw_target}",
            )


def _validate_codex_references(codex_root: Path, skills_root: Path, validation: Validation) -> None:
    skill_names = {path.parent.name for path in skills_root.glob("*/SKILL.md")}
    for source_file in sorted(codex_root.rglob("*")):
        if not source_file.is_file() or "node_modules" in source_file.parts:
            continue
        if source_file.suffix not in {".md", ".yaml", ".toml"}:
            continue
        contents = source_file.read_text(encoding="utf-8")
        if ".codex/skills" in contents:
            validation.errors.append(
                f"{source_file}: use the native .agents/skills path, not .codex/skills"
            )
        for match in PSTACK_SKILL_REFERENCE_PATTERN.finditer(contents):
            name = match.group("name")
            if name != "skill-name":
                validation.require(
                    name in skill_names,
                    f"{source_file}: unknown pstack skill reference: {name}",
                )

    generated_artifacts = sorted(
        path.relative_to(codex_root)
        for path in codex_root.rglob("*")
        if path.name == "__pycache__"
        or path.suffix == ".pyc"
        or (path.is_dir() and path.name == "node_modules")
    )
    validation.require(
        not generated_artifacts,
        "generated artifacts must not ship: "
        + ", ".join(str(path) for path in generated_artifacts),
    )


def _validate_port_map(
    plugin_root: Path,
    codex_root: Path,
    upstream_root: Path | None,
    validation: Validation,
) -> None:
    port_map = _load_json(codex_root / "PORT-MAP.json", validation)
    entries = port_map.get("entries")
    if not isinstance(entries, list):
        validation.errors.append("PORT-MAP.json: entries must be an array")
        return
    validation.require(
        len(entries) == EXPECTED_UPSTREAM_FILES,
        f"port map: expected {EXPECTED_UPSTREAM_FILES} entries, found {len(entries)}",
    )
    sources: list[str] = []
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            validation.errors.append(f"port map entry {index}: expected object")
            continue
        source = entry.get("source")
        destinations = entry.get("codexDestinations")
        if not isinstance(source, str) or not isinstance(destinations, list):
            validation.errors.append(f"port map entry {index}: invalid source or destinations")
            continue
        sources.append(source)
        dual_target_root = codex_root.parent
        if (dual_target_root / ".cursor-plugin" / "plugin.json").is_file():
            validation.require(
                (dual_target_root / source).is_file(),
                f"port map: source not preserved: {source}",
            )
            for destination in destinations:
                validation.require(
                    isinstance(destination, str)
                    and (dual_target_root / destination).is_file(),
                    f"port map: destination missing: {destination}",
                )
    validation.require(len(sources) == len(set(sources)), "port map: duplicate source entries")
    if upstream_root is not None:
        actual = sorted(
            path.relative_to(upstream_root).as_posix()
            for path in upstream_root.rglob("*")
            if path.is_file()
            and ".git" not in path.parts
            and path.relative_to(upstream_root).parts[0] != "codex"
        )
        validation.require(sorted(sources) == actual, "port map: frozen upstream inventory differs")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstream-root", type=Path)
    arguments = parser.parse_args()

    validation = Validation()
    codex_root = Path(__file__).resolve().parents[1]
    plugin_root, codex_root, manifest = _layout(codex_root, validation)
    skills_root = _validate_manifest(plugin_root, manifest, validation)
    _validate_skills(skills_root, validation)
    _validate_agents(codex_root, validation)
    _validate_hooks(plugin_root, codex_root, validation)
    _validate_markdown_links(codex_root, validation)
    _validate_codex_references(codex_root, skills_root, validation)
    _validate_port_map(plugin_root, codex_root, arguments.upstream_root, validation)

    if validation.errors:
        for error in validation.errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"validation failed with {len(validation.errors)} error(s)", file=sys.stderr)
        return 1
    print(
        f"validated {EXPECTED_SKILLS} skills, {EXPECTED_EXPLICIT_ONLY} explicit-only "
        f"policies, 6 agents, hooks, manifest, and {EXPECTED_UPSTREAM_FILES} mapped files"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

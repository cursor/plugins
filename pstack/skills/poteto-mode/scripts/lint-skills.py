#!/usr/bin/env python3
"""Structural lint for pstack skills.

For every `<root>/<skill>/SKILL.md`: the frontmatter parses and carries
`name` and `description`; `name` slugified (lowercase, non-alphanumerics to
hyphens) equals the directory name, so a display name like "Poteto Mode"
passes for poteto-mode; relative
markdown links resolve from the skill directory; a backticked path whose
first segment is a subdirectory of the skill (`references/x.md`,
`scripts/log.sh`, `playbooks/feature.md`) exists, templates and globs
(`<name>`, `*`) excepted; a bold `**principle-*`**
reference names a skill that exists. Em dashes, en dashes and arrows are
counted per skill and reported, never blocking.

Usage: lint-skills.py [<skills-root or skill-dir>...] [--dashes] [--self-test]
  No path: the `skills/` directory this script ships in.
  --dashes: print the dash and arrow count per skill, highest first.
  --self-test: plant one defect per check in a temp tree and require each
    to be caught, plus a clean fixture that passes.
Exit: 0 clean, 1 findings, 2 usage or self-test red.
"""
from __future__ import annotations

import os
import re
import sys
import tempfile
from typing import Dict, List, Optional, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
LINK_RE = re.compile(r"\]\(([^)\s]+)\)")
CODE_RE = re.compile(r"`([^`\n]+)`")
BOLD_RE = re.compile(r"\*\*(principle-[a-z0-9-]+)\*\*")
FIELD_RE = re.compile(r"^([A-Za-z_-]+):\s*(.*)$")
DASHES = ("—", "–", "→", "←", "⇒")


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


def frontmatter(text: str) -> Tuple[Optional[Dict[str, str]], str, str]:
    if not text.startswith("---\n"):
        return None, "no YAML frontmatter", text
    end = text.find("\n---", 4)
    if end == -1:
        return None, "frontmatter never closes", text
    fields: Dict[str, str] = {}
    for line in text[4:end].splitlines():
        m = FIELD_RE.match(line)
        if m:
            fields[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    body = text[end + 4:]
    return fields, "", body


def skill_dirs(path: str) -> List[str]:
    if os.path.isfile(os.path.join(path, "SKILL.md")):
        return [os.path.abspath(path)]
    out = []
    for name in sorted(os.listdir(path)):
        d = os.path.join(path, name)
        if not name.startswith(".") and os.path.isdir(d):
            out.append(os.path.abspath(d))
    return out


def lint_skill(skill_dir: str, known: set) -> Tuple[List[str], int]:
    name = os.path.basename(skill_dir)
    skill_md = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(skill_md):
        return ["%s: SKILL.md missing" % name], 0
    with open(skill_md, encoding="utf-8") as fh:
        text = fh.read()
    errors: List[str] = []
    fm, err, body = frontmatter(text)
    if fm is None:
        errors.append("%s: %s" % (name, err))
    else:
        if slug(fm.get("name", "")) != name:
            errors.append("%s: frontmatter name %r does not match the directory" % (name, fm.get("name", "")))
        if not fm.get("description"):
            errors.append("%s: frontmatter description missing" % name)
    subdirs = set(n for n in os.listdir(skill_dir) if os.path.isdir(os.path.join(skill_dir, n)))
    for m in LINK_RE.finditer(body):
        raw = m.group(1)
        if "://" in raw or raw.startswith("#") or raw.startswith("mailto:"):
            continue
        target = raw.split("#")[0]
        if target and not os.path.exists(os.path.normpath(os.path.join(skill_dir, target))):
            errors.append("%s: dead link %s" % (name, raw))
    for m in CODE_RE.finditer(body):
        token = m.group(1).strip()
        if " " in token or "/" not in token or any(ch in token for ch in "<>*"):
            continue
        if token.split("/")[0] not in subdirs:
            continue
        if not os.path.exists(os.path.join(skill_dir, token.rstrip("/"))):
            errors.append("%s: `%s` does not exist" % (name, token))
    for m in BOLD_RE.finditer(body):
        if m.group(1) not in known:
            errors.append("%s: **%s** names no skill" % (name, m.group(1)))
    dashes = sum(body.count(ch) for ch in DASHES)
    return errors, dashes


def run(paths: List[str], show_dashes: bool) -> int:
    dirs: List[str] = []
    for p in paths:
        if not os.path.isdir(p):
            print("✗ lint-skills: %s is not a directory" % p)
            return 2
        dirs.extend(skill_dirs(p))
    known = set(os.path.basename(d) for d in dirs)
    for p in paths:
        parent = os.path.dirname(os.path.abspath(p)) if os.path.isfile(os.path.join(p, "SKILL.md")) else p
        known.update(n for n in os.listdir(parent) if os.path.isdir(os.path.join(parent, n)))
    findings: List[str] = []
    counts: List[Tuple[int, str]] = []
    for d in dirs:
        errs, dashes = lint_skill(d, known)
        findings.extend(errs)
        counts.append((dashes, os.path.basename(d)))
    if show_dashes:
        for dashes, name in sorted(counts, reverse=True):
            print("%4d  %s" % (dashes, name))
    for f in findings:
        print("✗ %s" % f)
    total = sum(c for c, _ in counts)
    if findings:
        print("✗ lint-skills: %d findings in %d skills" % (len(findings), len(dirs)))
        return 1
    print("✓ lint-skills: %d skills clean, %d dashes/arrows in bodies" % (len(dirs), total))
    return 0


def _write(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def _fm(name: str, description: str = "fixture") -> str:
    desc = ("description: %s\n" % description) if description else ""
    return "---\nname: %s\n%s---\n" % (name, desc)


def self_test() -> int:
    fails = 0
    with tempfile.TemporaryDirectory() as tmp:
        root = os.path.join(tmp, "skills")
        _write(os.path.join(root, "principle-good", "SKILL.md"), _fm("principle-good") + "# ok\n")
        _write(os.path.join(root, "display-name", "SKILL.md"), _fm("Display Name") + "# ok\n")
        _write(
            os.path.join(root, "good", "SKILL.md"),
            _fm("good")
            + "See [ref](references/a.md), `scripts/run.sh`, **principle-good**.\n"
            + "Templates and globs are not paths: `references/<name>.md`, `references/*.md`.\n",
        )
        _write(os.path.join(root, "good", "references", "a.md"), "a\n")
        _write(os.path.join(root, "good", "scripts", "run.sh"), "#!/bin/sh\n")
        planted = {
            "bad-name": (_fm("other") + "# x\n", "does not match the directory"),
            "no-desc": (_fm("no-desc", "") + "# x\n", "description missing"),
            "no-front": ("# no frontmatter here\n", "no YAML frontmatter"),
            "dead-link": (_fm("dead-link") + "see [gone](./missing.md)\n", "dead link ./missing.md"),
            "bad-ref": (_fm("bad-ref") + "apply **principle-nope** here\n", "**principle-nope** names no skill"),
            "bad-path": (_fm("bad-path") + "run `references/missing.md`\n", "`references/missing.md` does not exist"),
        }
        for skill, (text, _) in planted.items():
            _write(os.path.join(root, skill, "SKILL.md"), text)
        _write(os.path.join(root, "bad-path", "references", "present.md"), "x\n")
        known = set(os.listdir(root))
        for skill, (_, fragment) in planted.items():
            errs, _ = lint_skill(os.path.join(root, skill), known)
            if not any(fragment in e for e in errs):
                print("✗ self-test %s: expected a finding containing %r, got %s" % (skill, fragment, errs or "clean"))
                fails += 1
        for skill in ("good", "principle-good", "display-name"):
            errs, _ = lint_skill(os.path.join(root, skill), known)
            if errs:
                print("✗ self-test %s: expected clean, got %s" % (skill, errs))
                fails += 1
    if fails:
        print("✗ lint-skills --self-test: %d failures" % fails)
        return 2
    print("✓ lint-skills --self-test: %d planted defects caught, 3 clean fixtures pass" % len(planted))
    return 0


def main(argv: List[str]) -> int:
    if "--self-test" in argv:
        return self_test()
    show_dashes = "--dashes" in argv
    paths = [a for a in argv if not a.startswith("--")]
    if any(a.startswith("--") and a not in ("--dashes",) for a in argv):
        print(__doc__)
        return 2
    return run(paths or [DEFAULT_ROOT], show_dashes)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

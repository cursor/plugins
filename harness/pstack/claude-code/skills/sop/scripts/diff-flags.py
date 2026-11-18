#!/usr/bin/env python3
"""diff-flags.py — what a change actually touched, judged from the diff, not
from how the task was described.

Two uses (SKILL.md §2, §6):
  1. Tiny gate. The orchestrator may make a tiny edit itself, without review.
     Whether it was tiny is decided here, after the edit: more than one code
     file or more than 10 changed lines, a dependency manifest or lockfile, a
     CI/build file, or a weakened test makes it a reviewed change. Kander
     judges its review whitelist the same way, on the real `git diff`
     (KANDER-REVIEW-RULES.md: "rephrasing a task to bypass review is
     forbidden"); its retrospective's "ordinary UI change" turned out to touch
     a protocol contract, three codegen targets and release builds.
  2. Reviewer brief. Every FLAG line is already a lead (`path:line` — what is
     there), so the orchestrator copies them under "Unverified leads" and the
     reviewer looks at each deleted test, new skip marker and removed
     assertion. A green suite proves little if the suite was weakened.

Visual files (v1.10.0). dsh-superagent (prompts/work.md:3): "A localized element
or few CSS edits do not establish small visual impact." A style or template file
(VISUAL_EXT) prints a `visual:` line — the reviewer's lead for Before/After
captures (SKILL.md §6). It also makes the change NOT_TINY unless --settled names
where the target look is fixed (the human's exact words, a design spec, a
verified prior state); the claim is echoed in the DIFF line, which the tiny
report carries, so the human sees what the orchestrator relied on. With
--settled the visual line still prints: the captures are still owed.

Usage: diff-flags.py <repo> [--base <rev>] [--settled "<where the target is fixed>"]
       (default base: HEAD; the work tree, staged changes and untracked files are
       all compared against it)
Output: one `DIFF …` summary line, then `- \\`path[:line]\\` — <flag>` lines,
        then TINY_OK or NOT_TINY.
Exit: 0 = TINY_OK, 1 = NOT_TINY, 64 = usage.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

CODE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".kt", ".kts",
            ".swift", ".m", ".mm", ".c", ".cc", ".cpp", ".h", ".hpp", ".rb", ".php", ".sh", ".bash",
            ".sql", ".vue", ".svelte", ".dart", ".cs", ".scala", ".lua"}
DEPS = re.compile(r"(^|/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|"
                  r"requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|uv\.lock|Pipfile(\.lock)?|"
                  r"go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|Podfile(\.lock)?|"
                  r"build\.gradle(\.kts)?|[^/]+\.csproj)$")
CI = re.compile(r"(^|/)(\.github/|\.gitlab-ci\.yml$|\.circleci/|Jenkinsfile$|Dockerfile[^/]*$|"
                r"docker-compose[^/]*\.ya?ml$|compose[^/]*\.ya?ml$|Makefile$|eas\.json$)")
TEST_PATH = re.compile(r"(^|/)(tests?|__tests__|spec)/|(\.|_)(test|spec)\.[^/]+$|(^|/)test_[^/]+\.py$|_test\.(go|py)$")
SKIP = re.compile(r"\b(?:it|test|describe)\.(?:skip|todo)\s*\(|\bx(?:it|describe|test)\s*\(|@pytest\.mark\.(?:skip|xfail)"
                  r"|\bpytest\.skip\s*\(|@unittest\.skip|\bt\.Skip(?:Now|f)?\s*\(|#\[ignore\]|@Disabled\b|@Ignore\b")
ASSERT = re.compile(r"\bexpect\s*\(|\bassert\w*\b|\bt\.(?:Error|Fatal)f?\s*\(|\brequire\.\w+\s*\(|\bshould\.")
VISUAL_EXT = {".css", ".scss", ".sass", ".less", ".styl", ".html", ".htm", ".vue", ".svelte"}
MAX_FILES, MAX_LINES = 1, 10


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout


def untracked(repo: Path) -> list[str]:
    return [p for p in git(repo, "ls-files", "-z", "--others", "--exclude-standard").split("\0") if p]


def scan(repo: Path, base: str) -> tuple[str, list[str], list[str]]:
    """(DIFF summary, flags that make it NOT_TINY, visual lines)."""
    flags: list[str] = []
    numstat: dict[str, tuple[int, int]] = {}
    for line in git(repo, "diff", "--numstat", base).splitlines():
        a, d, path = line.split("\t", 2)
        numstat[path] = (int(a) if a != "-" else 0, int(d) if d != "-" else 0)
    for path in untracked(repo):
        try:
            numstat[path] = (len((repo / path).read_text(errors="ignore").splitlines()), 0)
        except (OSError, IsADirectoryError):
            numstat[path] = (0, 0)
    deleted = set(git(repo, "diff", "--name-only", "--diff-filter=D", base).splitlines())

    code = [p for p in numstat if Path(p).suffix in CODE_EXT]
    added = sum(a for a, _ in numstat.values()); removed = sum(d for _, d in numstat.values())
    summary = f"DIFF files={len(numstat)} code_files={len(code)} lines=+{added}/-{removed} base={base}"
    if len(code) > MAX_FILES or added + removed > MAX_LINES:
        flags.append(f"- `{repo}` — size: {len(code)} code files, {added + removed} lines (tiny allows ≤ {MAX_FILES} code file and ≤ {MAX_LINES} lines)")
    for p in sorted(numstat):
        if DEPS.search(p):
            flags.append(f"- `{p}` — dependency manifest or lockfile changed")
        elif CI.search(p):
            flags.append(f"- `{p}` — CI/build file changed")
    for p in sorted(deleted):
        if TEST_PATH.search(p):
            flags.append(f"- `{p}` — test file deleted")

    # Walk the patch of tracked test files: new skip markers (with their new line
    # number) and the net change in assertion lines.
    diff = git(repo, "diff", "-U0", base, "--", *[p for p in numstat if TEST_PATH.search(p) and p not in deleted]) if any(
        TEST_PATH.search(p) and p not in deleted for p in numstat) else ""
    path, line_no, asserts = None, 0, {}
    for raw in diff.splitlines():
        if raw.startswith("+++ "):
            path = raw[6:] if raw.startswith("+++ b/") else None
            continue
        m = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)", raw)
        if m:
            line_no = int(m.group(1)); continue
        if path is None or raw.startswith("---"):
            continue
        if raw.startswith("+"):
            if SKIP.search(raw):
                flags.append(f"- `{path}:{line_no}` — skip marker added: {SKIP.search(raw).group(0).strip()}")
            if ASSERT.search(raw):
                asserts[path] = asserts.get(path, 0) + 1
            line_no += 1
        elif raw.startswith("-") and ASSERT.search(raw):
            asserts[path] = asserts.get(path, 0) - 1
    for p, net in sorted(asserts.items()):
        if net < 0:
            flags.append(f"- `{p}` — {-net} more assertion lines removed than added")
    for p in untracked(repo):
        if TEST_PATH.search(p) and SKIP.search((repo / p).read_text(errors="ignore")):
            flags.append(f"- `{p}` — new test file contains a skip marker")
    visual = [f"- `{p}` — visual: style/template changed; Before/After captures required (SKILL.md §6)"
              for p in sorted(numstat) if Path(p).suffix in VISUAL_EXT and p not in deleted]
    return summary, flags, visual


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("--base", default="HEAD")
    ap.add_argument("--settled", help="where the target look is fixed; lets a visual edit stay tiny")
    args = ap.parse_args()
    repo = Path(args.repo)
    try:
        repo = Path(git(repo, "rev-parse", "--show-toplevel").strip())
        summary, flags, visual = scan(repo, args.base)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"usage error: {exc}", file=sys.stderr)
        return 64
    settled = (args.settled or "").strip()
    print(summary + (f' settled="{settled}"' if settled else ""))
    for f in flags + visual:
        print(f)
    if not settled:
        flags += visual
    print("TINY_OK — report it as 未经独立 review, with the DIFF line" if not flags
          else "NOT_TINY — this is a reviewed change: dispatch a writer and a reviewer; copy the flag lines into the reviewer brief's Unverified leads")
    return 0 if not flags else 1


if __name__ == "__main__":
    sys.exit(main())

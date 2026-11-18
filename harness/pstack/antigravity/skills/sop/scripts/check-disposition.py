#!/usr/bin/env python3
"""check-disposition.py — every review finding gets an answer, with evidence.

Before v1.9.0 the writer "fixed blockers" and nothing else: a writer that
thought a B-n was wrong could only fix a false finding or let the reviewer
block again until the recheck limit sent it to the human, and SUGGESTED items
vanished. Kander's fix round (rules/snippets/fix-round.md) never accepts or
rejects a finding without checking it, ends each one as confirmed, rejected or
unverifiable, and shows every open item to the user. This is that rule as a
shape check on templates/disposition.md.

Usage: check-disposition.py <review-n.md> <disposition-n.md>
Output: DISPOSITION_OK with `RECHECK: needed | skip | none`, and one
        `HUMAN: <id> — <理由>` line per 无法核实; or DISPOSITION_INVALID.
Exit: 0 = OK, 1 = INVALID, 64 = usage.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

FINDING = re.compile(r"^\s*(?:[-*]\s*)?\**((?:B|S)-\d+)\b\**(.*)$")
ROW = re.compile(r"^\|\s*((?:B|S)-\d+)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$")
OUTCOMES = ("已修复", "驳回", "无法核实", "暂缓")
EVIDENCE = re.compile(r"`[^`]+`")
MECHANICAL = "[机械]"


KEY = re.compile(r"^[`*\s]*(VERDICT|BLOCKING|SUGGESTED|EVIDENCE|TREE)\s*:\s*(.*)$")


def findings(review: str) -> dict[str, str]:
    """Open B-n / S-n: the ids that start a line under BLOCKING: / SUGGESTED:.
    A recheck's verification of earlier items lives under EVIDENCE and is not
    a new finding."""
    out: dict[str, str] = {}
    section = None
    for line in review.splitlines():
        k = KEY.match(line)
        if k:
            section = k.group(1) if k.group(1) in ("BLOCKING", "SUGGESTED") else None
            line = k.group(2).strip("` ")
        elif line.startswith("#"):
            section = None
            continue
        if section is None:
            continue
        m = FINDING.match(line)
        if m and m.group(1) not in out:
            out[m.group(1)] = m.group(2).strip(" :：*—-`")
    return out


def check(review: str, disposition: str) -> tuple[list[str], list[str], str]:
    found = findings(review)
    rows: dict[str, tuple[str, str, str]] = {}
    problems: list[str] = []
    for line in re.sub(r"<!--.*?-->", "", disposition, flags=re.DOTALL).splitlines():
        m = ROW.match(line)
        if not m:
            continue
        rid, outcome, reason, evidence = m.groups()
        if rid in rows:
            problems.append(f"{rid} answered twice")
        rows[rid] = (outcome, reason, evidence)
    for rid in found:
        if rid not in rows:
            problems.append(f"{rid} has no row — every finding is answered, none is skipped")
    for rid in rows:
        if rid not in found:
            problems.append(f"{rid} is not a finding in this review — answer the newest review only")
    human: list[str] = []
    for rid, (outcome, reason, evidence) in rows.items():
        if outcome not in OUTCOMES:
            problems.append(f"{rid}: 结论 {outcome!r} is not one of {' / '.join(OUTCOMES)}")
            continue
        if outcome == "暂缓" and rid.startswith("B-"):
            problems.append(f"{rid}: a blocking finding cannot be 暂缓 — fix it, reject it with evidence, or mark it 无法核实")
        if not reason or reason.startswith("<"):
            problems.append(f"{rid}: 理由 is empty")
        if outcome in ("已修复", "驳回") and not EVIDENCE.search(evidence):
            problems.append(f"{rid}: {outcome} needs evidence — a backticked `path:line` or command; impressions do not count")
        if outcome == "无法核实":
            human.append(f"HUMAN: {rid} — {reason}")
    open_b = [rid for rid in found if rid.startswith("B-")]
    if not open_b:
        recheck = "none"
    elif all(MECHANICAL in found[rid] and rows.get(rid, ("",))[0] == "已修复" for rid in open_b):
        recheck = "skip"
    else:
        recheck = "needed"
    return problems, human, recheck


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: check-disposition.py <review-n.md> <disposition-n.md>", file=sys.stderr)
        return 64
    try:
        review, disposition = (Path(p).read_text(encoding="utf-8") for p in sys.argv[1:])
    except OSError as exc:
        print(f"usage error: {exc}", file=sys.stderr)
        return 64
    problems, human, recheck = check(review, disposition)
    if problems:
        print("DISPOSITION_INVALID " + sys.argv[2] + " — return to the writer")
        for p in problems:
            print("  - " + p)
        return 1
    print(f"DISPOSITION_OK {sys.argv[2]}")
    print(f"RECHECK: {recheck}" + {"skip": " — every open B-n is [机械] and 已修复; the writer's evidence closes it",
                                    "none": " — no blocking finding",
                                    "needed": " — dispatch the recheck with this file in the reviewer's reading list"}[recheck])
    for h in human:
        print(h)
    return 0


if __name__ == "__main__":
    sys.exit(main())

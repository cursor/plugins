#!/usr/bin/env python3
"""extract-gate-packet.py — print a plan's "## Gate packet" section verbatim.

The orchestrator's §4 gate message is exactly this script's stdout plus
nothing else. Observed live (2026-09-04): a 793-line plan carried seven human
decisions, a missing-information item, and a "this number is not a
measurement" caveat; the orchestrator relayed a 632-character summary of its
own that contained none of them. A light-model orchestrator cannot be asked
to "summarise faithfully" — it can be asked to run this and paste.

The block is checked against templates/gate-packet.md before it is printed.
The human reads only this block and cannot open the plan (2026-10-28: 「我没办法
去读所有md里面的内容……无法做出判断」), so the checks enforce a fixed frame —
problem, what changes, decisions, defaults, what approval covers — and refuse
what made past packets unreadable: decisions that hold nothing, options without
a recommendation or consequence, IDs defined somewhere the human cannot see.

A decision holds only its phase (v1.10.0, from dsh-superagent: "state may remain
progress while you continue unambiguous authorized work", prompts/handoff-worker.md:1).
When 要你决定 has a D-n, 批准后 must say what starts now — `- 不等回复：<phases | 无>` —
so the orchestrator dispatches it while the packet waits instead of idling until the
reply, and does not have to infer the complement from a plan it may not judge.

The plan's `## 验收标准` is checked too: one `- A-n：<result>` line per
criterion, each one checkable result (Kander's card contract rule, from
ASD-STE100). The reviewer checks the implementation against these lines, so a
criterion nobody can check ("体验更好", "正常显示", "等") is refused here.

Usage: extract-gate-packet.py <plan.md> [--max-lines 30] [--max-chars 1500]
Exit: 0 = GATE_PACKET_OK (section printed to stdout, verdict to stderr)
      1 = GATE_PACKET_MISSING / GATE_PACKET_INVALID (reasons on stderr)
      64 = usage
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys

HEADING = re.compile(r"^## +Gate packet\s*$", re.IGNORECASE)
NEXT_H2 = re.compile(r"^## ")
SECTIONS = ("问题", "要改什么", "要你决定", "默认做法", "批准后")
DECISION = re.compile(r"^\*\*(D-\d+)\b[^*]*\*\*\s*[（(]卡住[：:]\s*([^）)]*)[）)]\s*$")
DECISION_START = re.compile(r"^\**D-\d+\b")
HOLDS_NOTHING = re.compile(r"^(无|没有|不卡|nothing|none|—|-)?$", re.IGNORECASE)
OPTION = re.compile(r"^(\d+)\.\s+(.*)$")
CONSEQUENCE = re.compile(r"(\s*[—–]{1,2}|\s-{1,2}\s)\s*\S")
RECOMMENDED = re.compile(r"[（(]推荐[）)]")
ID_MENTION = re.compile(r"\bD-[A-Za-z]*\d+\b")
PLACEHOLDER = re.compile(r"<[^<>\n]{2,}>")
FINAL = re.compile(r"^回复[：:].*不批准")
NOT_WAITING = re.compile(r"^- *不等回复[：:]\s*\S")
COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
MAX_LINE = 120
CRITERIA_HEADING = re.compile(r"^## +验收标准\s*$")
CRITERION = re.compile(r"^- (A-\d+)[：:]\s*(\S.*)$")
VAGUE = re.compile(r"正常|合理|优化|尽量|适当|更好|友好|完善|一些|之类|等等|等(?=[。，、；）)]|$)")
# ste-zh R7: a descriptive sentence is ≤ 40 字 — a CJK character counts 1, an English
# word, number, or identifier counts 1, punctuation counts 0.
STE_WORD = re.compile(r"[㐀-鿿]|[A-Za-z0-9][A-Za-z0-9_.:/\-]*")
MAX_CRITERION = 40
# ste-zh R3 and terminology.md §3: a filler verb wraps the action in a noun.
FILLER_VERB = re.compile(r"对.{1,15}?进行|进行(?!中)|实现.{0,10}?功能|予以|加以|做好.{0,10}?工作|完成.{0,10}?的操作"
                         r"|将会|作出.{0,6}?决定|通过.{0,10}?的方式|存在.{0,10}?问题|有一定的|处理")


def extract(text: str) -> tuple[str | None, list[str]]:
    lines = text.splitlines()
    start = next((i for i, l in enumerate(lines) if HEADING.match(l)), None)
    if start is None:
        return None, ["no '## Gate packet' section — the writer must add one (templates/gate-packet.md)"]
    end = next((i for i in range(start + 1, len(lines)) if NEXT_H2.match(lines[i])), len(lines))
    block = "\n".join(lines[start:end]).rstrip() + "\n"
    block = COMMENT.sub("", block)
    block = re.sub(r"\n{3,}", "\n\n", block).strip() + "\n"
    return block, []


def sections(block: str) -> dict[str, list[str]]:
    """### heading → its non-empty lines, in order of appearance."""
    out: dict[str, list[str]] = {}
    current = None
    for line in block.splitlines()[1:]:
        m = re.match(r"^### +(.+?)\s*$", line)
        if m:
            current = m.group(1)
            out[current] = []
        elif current is not None and line.strip():
            out[current].append(line.strip())
    return out


def check_decisions(lines: list[str]) -> list[str]:
    problems: list[str] = []
    if lines and lines[0] == "无" and len(lines) == 1:
        return problems
    items: list[tuple[str, str, list[str]]] = []
    for line in lines:
        if DECISION_START.match(line):
            m = DECISION.match(line)
            if not m:  # malformed heading: its D-n stays undefined and is reported below
                items.append((line[:12], "?", []))
                continue
            items.append((m.group(1), m.group(2).strip(), []))
        elif items:
            items[-1][2].append(line)
        else:
            problems.append(f"要你决定 must be the line 无 or D-n items; found {line[:60]!r}")
    if not items and not problems:
        problems.append("要你决定 is empty: write 无, or D-n items")
    for did, holds, body in items:
        if holds != "?" and HOLDS_NOTHING.match(holds):
            problems.append(f"{did} holds nothing — it is not a decision; move it to 默认做法")
        options = [OPTION.match(l) for l in body]
        options = [o for o in options if o]
        if len(options) < 2:
            problems.append(f"{did} needs at least 2 numbered options")
            continue
        if not RECOMMENDED.search(options[0].group(2)):
            problems.append(f"{did}: option 1 must be the recommendation, marked （推荐）")
        for o in options[1:]:
            if RECOMMENDED.search(o.group(2)):
                problems.append(f"{did}: only option 1 may be marked （推荐）")
        for o in options:
            if not CONSEQUENCE.search(o.group(2)):
                problems.append(f"{did} option {o.group(1)} has no consequence: write <option> — <what happens>")
    return problems


def criteria_hash(text: str) -> str | None:
    """Hash of the plan's A-n lines, whitespace-normalised. Printed with GATE_PACKET_OK
    and recorded with the human's approval; extract-delivery-report.py recomputes it, so
    criteria edited after approval cannot be reviewed or delivered against silently."""
    lines = text.splitlines()
    start = next((i for i, l in enumerate(lines) if CRITERIA_HEADING.match(l)), None)
    if start is None:
        return None
    end = next((i for i in range(start + 1, len(lines)) if NEXT_H2.match(lines[i])), len(lines))
    items = [re.sub(r"\s+", " ", l.strip()) for l in COMMENT.sub("", "\n".join(lines[start + 1:end])).splitlines() if CRITERION.match(l.strip())]
    return hashlib.sha256("\n".join(items).encode()).hexdigest()[:12] if items else None


def check_criteria(text: str) -> list[str]:
    """The plan's ## 验收标准: one checkable result per - A-n： line."""
    lines = text.splitlines()
    start = next((i for i, l in enumerate(lines) if CRITERIA_HEADING.match(l)), None)
    if start is None:
        return ["plan has no '## 验收标准' section: one '- A-n：<checkable result>' line per criterion"]
    end = next((i for i in range(start + 1, len(lines)) if NEXT_H2.match(lines[i])), len(lines))
    body = [l.strip() for l in COMMENT.sub("", "\n".join(lines[start + 1:end])).splitlines() if l.strip()]
    problems: list[str] = []
    seen: set[str] = set()
    for line in body:
        m = CRITERION.match(line)
        if not m:
            problems.append(f"验收标准 line is not '- A-n：<result>': {line[:50]!r}")
            continue
        aid, result = m.groups()
        if aid in seen:
            problems.append(f"{aid} appears twice")
        seen.add(aid)
        if (n := len(STE_WORD.findall(result))) > MAX_CRITERION:
            problems.append(f"{aid} is {n} 字 > {MAX_CRITERION} (ste-zh R7 count) — one checkable result per line; split it")
        if re.search(r"[。；;]\s*\S", result):
            problems.append(f"{aid} has more than one sentence — one result per criterion; split it")
        if (v := VAGUE.search(result)):
            problems.append(f"{aid} uses {v.group(0)!r}, which nobody can check — state the observable result (a number, a screen, an output)")
        if (f := FILLER_VERB.search(result)):
            problems.append(f"{aid} uses the filler verb {f.group(0)!r} — write the action itself (ste-zh terminology §3: 「对 X 进行修改」→「修改 X」)")
    if not seen and not problems:
        problems.append("验收标准 is empty")
    return problems


def validate(block: str, max_lines: int, max_chars: int) -> list[str]:
    problems: list[str] = []
    n_lines = block.count("\n")
    if n_lines > max_lines:
        problems.append(f"{n_lines} lines > {max_lines}: the human reads this on a phone — cut it; detail stays in the plan body")
    if len(block) > max_chars:
        problems.append(f"{len(block)} chars > {max_chars}")
    for line in block.splitlines():
        if len(line) > MAX_LINE:
            problems.append(f"line over {MAX_LINE} characters — split it: {line[:40]!r}…")
    found = sections(block)
    order = [h for h in found if any(h.startswith(s) for s in SECTIONS)]
    for name in SECTIONS:
        if not any(h.startswith(name) for h in found):
            problems.append(f"missing section '### {name}'")
    if [next(s for s in SECTIONS if h.startswith(s)) for h in order] != [s for s in SECTIONS if any(h.startswith(s) for h in order)]:
        problems.append("sections out of order: 问题 → 要改什么 → 要你决定 → 默认做法 → 批准后")
    decisions = next((v for h, v in found.items() if h.startswith("要你决定")), None)
    if decisions is not None:
        problems += check_decisions(decisions)
    after = next((v for h, v in found.items() if h.startswith("批准后")), [])
    if decisions and decisions != ["无"] and not any(NOT_WAITING.match(l) for l in after):
        problems.append("批准后 needs '- 不等回复：<phases no D-n holds | 无>' — a decision holds only its phase; "
                        "say what starts while the human decides")
    defined = {m.group(1) for line in (decisions or []) if (m := DECISION.match(line))}
    undefined = sorted({d for d in ID_MENTION.findall(block)} - defined)
    if undefined:
        problems.append(f"cites {', '.join(undefined)}, not defined in this block — if it is a decision here, its heading must be "
                        f"**D-n <question>**（卡住：<phase>）; if it comes from elsewhere, the human cannot look it up: say it in one sentence")
    if PLACEHOLDER.search(re.sub(r"`[^`]*`", "", block.rsplit("\n", 2)[0])):
        problems.append("template placeholders (<…>) still present")
    last = block.strip().splitlines()[-1] if block.strip() else ""
    if not FINAL.search(last):
        problems.append("last line must be the reply line: 回复：按推荐 / D-1 选 <n> / 改：<哪里> / 不批准")
    elif decisions and decisions != ["无"] and "按推荐" not in last:
        problems.append("reply line must offer 按推荐 when there are decisions")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("--max-lines", type=int, default=30)
    ap.add_argument("--max-chars", type=int, default=1500)
    args = ap.parse_args()
    try:
        text = open(args.plan, encoding="utf-8").read()
    except OSError as exc:
        print(f"usage error: {exc}", file=sys.stderr)
        return 64
    block, problems = extract(text)
    if block is None:
        print("GATE_PACKET_MISSING " + args.plan, file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    problems = validate(block, args.max_lines, args.max_chars) + check_criteria(text)
    if problems:
        print("GATE_PACKET_INVALID " + args.plan + " — return to the writer; do not fix or summarise it yourself (§0.5)", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    sys.stdout.write(block)
    print(f"GATE_PACKET_OK {args.plan} ({block.count(chr(10))} lines, {len(block)} chars) criteria={criteria_hash(text)}"
          f" — send stdout verbatim; record criteria=… with the approval", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

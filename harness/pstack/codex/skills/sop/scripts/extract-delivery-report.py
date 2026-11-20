#!/usr/bin/env python3
"""extract-delivery-report.py — print the "## 交付报告" section of the writer's
final handoff verbatim, followed by the reviewer's verdict line.

The orchestrator's final report is exactly this script's stdout. Before
v1.8.1 the orchestrator compiled the final report itself: some tasks got a
152-line English file list, some got nothing, and the orchestrator was
summarising other agents' artifacts, which SKILL.md §3 forbids. Kander, which
reports on 1,700+ tasks, fixes the report's fields and their order and never
accepts a free-form completion message; this is the same idea in the
gate-packet frame (templates/delivery-report.md).

The writer never writes the review result: the script appends it from the
newest review file's `VERDICT:` line, so the report cannot claim a review that
did not pass. Since v1.9.0 that line is also tied to the code (Kander binds a
review to exact commits: "who issued this PASS, and against exactly which
version of the code?"):
  - the review's `TREE: tree=…` must equal scripts/tree-stamp.sh on the repo as
    delivered — an edit, rebase or merge after the PASS, or a reviewer that
    changed the tree, is refused;
  - the plan's `## 验收标准` must still hash to the `criteria=…` recorded at the
    gate — criteria edited after approval are refused;
  - every finding of the newest review is answered in disposition-<n>.md, and
    each one left open (驳回 / 无法核实 / 暂缓) is listed for the human.

Since v1.10.0 (from dsh-superagent, prompts/work.md:9 and :45):
  - 结论 may start 无需改动 — investigated, nothing to change (not reproduced,
    not a defect, already fixed elsewhere); like 已完成 it is refused next to a
    失败 check;
  - a `## Handed back` section in the handoff lists requests beyond this task as
    `- > <human's words> — <one-sentence reason>`. Each quote must be verbatim in
    the intent.md beside the handoff; the items are appended after the review
    line, so the human sees that nothing was dropped silently.

Usage: extract-delivery-report.py <handoff.md> --review <review-n.md | none>
       [--repo <target repo> --plan <plan.md> --criteria <hash from the gate>]
       [--disposition <disposition-n.md>] [--max-lines 30] [--max-chars 1500]
       --repo, --plan and --criteria are required with a review file.
Exit: 0 = DELIVERY_REPORT_OK (report printed to stdout, verdict to stderr)
      1 = DELIVERY_REPORT_MISSING / DELIVERY_REPORT_INVALID (reasons on stderr)
      64 = usage
"""
from __future__ import annotations

import argparse
import importlib.util
import re
import sys
from pathlib import Path

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC

_spec = importlib.util.spec_from_file_location("egp", Path(__file__).with_name("extract-gate-packet.py"))
EGP = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(EGP)
_spec = importlib.util.spec_from_file_location("cdisp", Path(__file__).with_name("check-disposition.py"))
CD = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(CD)
_spec = importlib.util.spec_from_file_location("cbrief", Path(__file__).with_name("check-brief.py"))
CB = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(CB)
TREE = re.compile(r"^`?TREE:\s*(tree=[0-9a-f]{12})\b", re.MULTILINE)

HEADING = re.compile(r"^## +交付报告\s*$")
SECTIONS = ("结论", "改了什么", "验证", "没做", "要你决定", "怎么撤回")
OUTCOME = re.compile(r"^(已完成|无需改动|部分完成|阻塞|失败)[：:]\s*\S")
HANDED_BACK = re.compile(r"^## +Handed back\s*$", re.IGNORECASE)
HANDED_ITEM = re.compile(r"^- +> ?(\S.*?)\s+[—–]{1,2}\s+(\S.*)$")
CHECK = re.compile(r"^- (已验证|未验证|失败|未确认)[：:]\s*\S")
VERDICT = re.compile(r"^`?VERDICT:\s*(PASS|NEEDS_CHANGES|BLOCKED)\b", re.MULTILINE)


def extract(text: str) -> tuple[str | None, list[str]]:
    lines = text.splitlines()
    start = next((i for i, l in enumerate(lines) if HEADING.match(l)), None)
    if start is None:
        return None, ["no '## 交付报告' section — the writer's final handoff must end with one (templates/delivery-report.md)"]
    end = next((i for i in range(start + 1, len(lines)) if EGP.NEXT_H2.match(lines[i])), len(lines))
    block = EGP.COMMENT.sub("", "\n".join(lines[start:end]))
    block = re.sub(r"\n{3,}", "\n\n", block).strip() + "\n"
    return block, []


def validate(block: str, max_lines: int, max_chars: int) -> list[str]:
    problems: list[str] = []
    if block.count("\n") > max_lines:
        problems.append(f"{block.count(chr(10))} lines > {max_lines}: the human reads this on a phone — cut it")
    if len(block) > max_chars:
        problems.append(f"{len(block)} chars > {max_chars}")
    for line in block.splitlines():
        if len(line) > EGP.MAX_LINE:
            problems.append(f"line over {EGP.MAX_LINE} characters — split it: {line[:40]!r}…")
    found = EGP.sections(block)
    named = [next((s for s in SECTIONS if h.startswith(s)), None) for h in found]
    for name in SECTIONS:
        if name not in named:
            problems.append(f"missing section '### {name}'")
    present = [n for n in named if n]
    if present != [s for s in SECTIONS if s in present]:
        problems.append("sections out of order: " + " → ".join(SECTIONS))
    get = lambda name: next((v for h, v in found.items() if h.startswith(name)), [])
    outcome = get("结论")
    if len(outcome) != 1 or not OUTCOME.match(outcome[0]):
        problems.append("结论 must be one line: 已完成 / 无需改动 / 部分完成 / 阻塞 / 失败：<scope>")
    checks = get("验证")
    bad = [l for l in checks if not CHECK.match(l)]
    if not checks or bad:
        problems.append("every 验证 line must start with - 已验证 / 未验证 / 失败 / 未确认：" + (f" — {bad[0][:40]!r}" if bad else ""))
    if outcome and outcome[0].startswith(("已完成", "无需改动")) and any(CHECK.match(l).group(1) == "失败" for l in checks if CHECK.match(l)):
        problems.append(f"结论 says {outcome[0][:4].rstrip('：:')} but a check 失败 — write 部分完成 or 失败")
    for name in ("没做", "怎么撤回"):
        if not get(name):
            problems.append(f"{name} is empty: write 无 or the item")
    decisions = get("要你决定")
    problems += EGP.check_decisions(decisions)
    defined = {m.group(1) for line in decisions if (m := EGP.DECISION.match(line))}
    undefined = sorted(set(EGP.ID_MENTION.findall(block)) - defined)
    if undefined:
        problems.append(f"cites {', '.join(undefined)}, not defined in this block — say it in one sentence")
    if EGP.PLACEHOLDER.search(re.sub(r"`[^`]*`", "", block)):
        problems.append("template placeholders (<…>) still present")
    return problems


def handed_back(text: str, intent: Path) -> tuple[list[str], list[str]]:
    """(problems, lines to append) for the handoff's optional `## Handed back` section."""
    lines = text.splitlines()
    start = next((i for i, l in enumerate(lines) if HANDED_BACK.match(l)), None)
    if start is None:
        return [], []
    end = next((i for i in range(start + 1, len(lines)) if EGP.NEXT_H2.match(lines[i])), len(lines))
    body = [l.strip() for l in EGP.COMMENT.sub("", "\n".join(lines[start + 1:end])).splitlines() if l.strip()]
    if body == ["无"]:
        return [], []
    haystack = CB.intent_haystack(intent.read_text(encoding="utf-8")) if intent.is_file() else ""
    problems, out = [], []
    for line in body:
        m = HANDED_ITEM.match(line)
        if not m:
            problems.append(f"Handed back item is not '- > <human's words> — <reason>': {line[:50]!r} — give the one-sentence reason")
            continue
        if CB.squash(m.group(1)) not in haystack:
            problems.append(f"Handed back quote is not verbatim in {intent}: {m.group(1)[:40]!r} — quote the human, do not restate")
        out.append(f"- {m.group(1)} — {m.group(2)}")
    return problems, out


def review_line(review: str) -> tuple[str | None, str | None]:
    if review == "none":
        return "Review：未执行（没有独立 review）", None
    try:
        text = Path(review).read_text(encoding="utf-8")
    except OSError as exc:
        return None, f"cannot read review file: {exc}"
    m = VERDICT.search(text)
    if not m:
        return None, f"{review} has no 'VERDICT: PASS | NEEDS_CHANGES | BLOCKED' line"
    return f"Review：{m.group(1)}（{Path(review).name}）", None


def bindings(review: str, repo: str | None, plan: str | None, criteria: str | None, disposition: str | None) -> tuple[list[str], list[str]]:
    """Problems, and the open-item lines appended for the human."""
    if review == "none":
        return [], []
    problems: list[str] = []
    text = Path(review).read_text(encoding="utf-8") if Path(review).is_file() else ""
    if not (repo and plan and criteria):
        return ["with a review file, pass --repo, --plan and --criteria (the criteria=… recorded at the gate)"], []
    m = TREE.search(text)
    repo_path = Path(repo).resolve()
    ws_root = SC.find_sop_root(cwd=repo_path)
    ws = SC.load_workspace(ws_root)
    live = SC.tree_stamp_for_repo(repo_path, workspace=ws) if SC.is_git_work_tree(repo_path) else ""
    if not m:
        problems.append(f"{Path(review).name} has no 'TREE: tree=<hash>' line — the review is not tied to any code")
    elif m.group(1) != live:
        problems.append(f"{Path(review).name} covered {m.group(1)}, the repo is now {live or '?'} — the code changed after review "
                        f"(or during it); dispatch a recheck")
    try:
        now = EGP.criteria_hash(Path(plan).read_text(encoding="utf-8"))
    except OSError as exc:
        now, problems = None, problems + [f"cannot read plan: {exc}"]
    if now != criteria:
        problems.append(f"验收标准 now hash to criteria={now}, approved criteria={criteria} — changed after approval; that needs a new gate")
    found = CD.findings(text)
    if found and not disposition:
        problems.append(f"{Path(review).name} has findings ({', '.join(found)}) — pass --disposition; every finding is answered")
        return problems, []
    lines: list[str] = []
    if disposition:
        d_problems, _, _ = CD.check(text, Path(disposition).read_text(encoding="utf-8"))
        problems += [f"disposition: {p}" for p in d_problems]
        for row in Path(disposition).read_text(encoding="utf-8").splitlines():
            r = CD.ROW.match(row)
            if r and r.group(2) in ("驳回", "无法核实", "暂缓"):
                lines.append(f"- 未处理（{r.group(2)}）：{found.get(r.group(1), '')[:50]} — {r.group(3)}")
    return problems, lines


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("handoff")
    ap.add_argument("--review", required=True, help="newest review-<n>.md, or 'none' when no independent review ran")
    ap.add_argument("--repo", help="target repo as delivered; its tree-stamp must equal the review's TREE line")
    ap.add_argument("--plan", help="plan.md whose ## 验收标准 was approved")
    ap.add_argument("--criteria", help="criteria=<hash> recorded with the approval (printed by extract-gate-packet.py)")
    ap.add_argument("--disposition", help="disposition-<n>.md answering the newest review")
    ap.add_argument("--max-lines", type=int, default=30)
    ap.add_argument("--max-chars", type=int, default=1500)
    args = ap.parse_args()
    try:
        text = open(args.handoff, encoding="utf-8").read()
    except OSError as exc:
        print(f"usage error: {exc}", file=sys.stderr)
        return 64
    block, problems = extract(text)
    if block is None:
        print("DELIVERY_REPORT_MISSING " + args.handoff, file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    problems = validate(block, args.max_lines, args.max_chars)
    line, err = review_line(args.review)
    if err:
        problems.append(err)
    more, open_items = bindings(args.review, args.repo, args.plan, (args.criteria or "").removeprefix("criteria=") or None, args.disposition)
    problems += more
    back_problems, back = handed_back(text, Path(args.handoff).resolve().parent / "intent.md")
    problems += back_problems
    if problems:
        print("DELIVERY_REPORT_INVALID " + args.handoff + " — return to the writer; do not fix or summarise it yourself", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    sys.stdout.write(block + "\n" + line + "\n" + ("Review 未处理 %d 条：\n" % len(open_items) + "\n".join(open_items) + "\n" if open_items else "")
                     + ("退回 %d 条（不在本任务范围，需另开任务或另批）：\n" % len(back) + "\n".join(back) + "\n" if back else ""))
    print(f"DELIVERY_REPORT_OK {args.handoff} — send stdout verbatim", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

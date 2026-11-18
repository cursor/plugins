#!/usr/bin/env python3
"""Externalized task review & dispatch metrics recorder."""

from __future__ import annotations

import argparse
import datetime
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC

VALID_TIERS = {"T0_READONLY", "T1_STANDARD", "T2_HIGH_RISK", "T3_OPS_PROD"}

VERDICT_MAP = {
    "PASS": "PASS",
    "APPROVE": "PASS",
    "APPROVED": "PASS",
    "FAIL": "NEEDS_CHANGES",
    "FAILED": "NEEDS_CHANGES",
    "NEEDS_CHANGES": "NEEDS_CHANGES",
    "NEEDS CHANGES": "NEEDS_CHANGES",
    "CHANGES REQUESTED": "NEEDS_CHANGES",
    "CHANGES_REQUESTED": "NEEDS_CHANGES",
    "REQUEST CHANGES": "NEEDS_CHANGES",
    "REQUEST_CHANGES": "NEEDS_CHANGES",
    "REWORK": "NEEDS_CHANGES",
    "BLOCK": "NEEDS_CHANGES",
    "BLOCKED": "NEEDS_CHANGES",
}

VERDICT_TOKEN_PATTERN = (
    r"(PASS|APPROVED?|FAIL(?:ED)?|NEEDS[_ ]CHANGES|CHANGES[_ ]REQUESTED|"
    r"REQUEST[_ ]CHANGES|REWORK|BLOCK(?:ED)?)"
)
VERDICT_END_BOUNDARY = r"(?=$|[\s*`.,:：)）\]】\(（;；、])"


def normalize_verdict(review_text: str) -> str:
    m = re.search(
        rf"(?im)^\s*(?:[-*#>]+\s*)?[`*]*VERDICT[`*]*\s*[:：][`*\s]*{VERDICT_TOKEN_PATTERN}{VERDICT_END_BOUNDARY}",
        review_text,
    )
    if not m:
        m = re.search(
            rf"(?im)^\s*#{{1,4}}\s*[`*]*VERDICT[`*]*\s*\n+[`*\s]*{VERDICT_TOKEN_PATTERN}{VERDICT_END_BOUNDARY}",
            review_text,
        )
    if not m:
        head_lines = [ln.strip() for ln in review_text.splitlines() if ln.strip()][:5]
        for ln in head_lines:
            m2 = re.match(
                rf"^(?:[-*>]+\s*)?\*\*{VERDICT_TOKEN_PATTERN}(?:[.\s**）(（]|$)",
                ln,
                re.I,
            ) or re.match(r"^(?:APPROVE(?:D)?)\.(?:\s|$)", ln, re.I)
            if m2:
                m3 = re.search(rf"{VERDICT_TOKEN_PATTERN}{VERDICT_END_BOUNDARY}", ln, re.I)
                if m3:
                    m = m3
                    break
    if not m:
        raise ValueError("Missing or unrecognized VERDICT in review text")

    raw = re.sub(r"\s+", " ", m.group(1).strip().upper())
    normalized = VERDICT_MAP.get(raw) or VERDICT_MAP.get(raw.replace("_", " "))
    if not normalized:
        raise ValueError(f"Unsupported verdict token: {raw!r}")
    return normalized


def parse_review_summary(review_text: str) -> Tuple[str, Optional[str], List[Dict[str, object]], int, int]:
    verdict = normalize_verdict(review_text)

    tree_m = re.search(r"\btree=([0-9a-f]{7,40})\b", review_text, re.I)
    tree_hash = tree_m.group(1) if tree_m else None

    health_scores: List[Dict[str, object]] = []
    for line in review_text.splitlines():
        if "health score" not in line.lower():
            continue
        scoped = re.findall(
            r"\b([a-z0-9][a-z0-9_.-]{1,40})\b[ \t*`]*[:：]?[ \t*`]*(\d{1,3})[ \t]*/[ \t]*100",
            line,
            re.I,
        )
        scoped = [(s, sc) for s, sc in scoped if s.lower() not in ("health", "score")]
        if len(scoped) >= 2 or (len(scoped) == 1 and re.search(r"Health Score\s*[:：]\s*[a-z0-9_.-]+\s+\d+/100", line, re.I)):
            for scope, score in scoped:
                health_scores.append({"scope": scope, "score": int(score)})
            continue
        single = re.search(
            r"(?:^|[-*#>\s`])(?:([a-z0-9_.-]+)[ \t*`]*[:：]?[ \t]+)?[*`]*Health Score[*`]*[ \t]*[:：]?[ \t*`]*(\d{1,3})[ \t]*/[ \t]*100",
            line,
            re.I,
        )
        if single:
            health_scores.append({"scope": single.group(1) or "overall", "score": int(single.group(2))})

    active_b = set()
    in_blocking_section = False
    section_re = re.compile(
        r"^\s*(?:[-*#>]+\s*)?[`*]*(VERDICT|BLOCKING|SUGGESTED|NOTES|EVIDENCE|SUMMARY)[`*]*\s*[:：]?\s*(.*)$",
        re.I,
    )
    for line in review_text.splitlines():
        s = line.strip()
        if not s:
            continue
        sec_m = section_re.match(s)
        if sec_m and (":" in s or "：" in s or s.startswith("#") or sec_m.group(1).upper() in ("BLOCKING", "NOTES", "SUGGESTED", "EVIDENCE")):
            sec_name = sec_m.group(1).upper()
            in_blocking_section = sec_name == "BLOCKING"
            rest_inline = sec_m.group(2).strip("`* ")
            if in_blocking_section and rest_inline and rest_inline.lower() not in ("none", "无", "—", "-"):
                for bid in re.findall(r"\b(B-\d+)\b", rest_inline):
                    active_b.add(bid)
            continue
        if re.match(r"^\s*#{1,4}\s+", s) or re.match(r"^\s*`?\*\*(?:NOTES|SUGGESTED|EVIDENCE|Health Score)\b", s, re.I):
            in_blocking_section = False
            continue

        if in_blocking_section:
            if s.strip("`* -").lower() not in ("none", "无", "—", ""):
                for bid in re.findall(r"\b(B-\d+)\b", s):
                    active_b.add(bid)
            continue

        for m_b in re.finditer(r"\b(B-\d+)\b", s):
            bid = m_b.group(1)
            after = s[m_b.end() :]
            if re.match(
                r"^\s*[:：]?\s*(?:\*\*)?(?:FIXED|已修复)(?:\*\*)?\s*(?:[（(](?:review-\d+|上轮)[^）)]*[）)]|\s*$)",
                after,
            ) or re.match(r"^\s*（(?:review-\d+|上轮)[^）)]*）", after):
                continue
            active_b.add(bid)

    notes_or_suggestions = set(
        re.findall(r"(?m)^(?:###?\s*|[-*]\s*|\d+[.)]\s*|>\s*|•\s*|\[\s*\]\s*|\|\s*|\*\*)*\s*([SN]-\d+)\b", review_text)
    )
    return verdict, tree_hash, health_scores, len(active_b), len(notes_or_suggestions)


def pick_latest_review(task_dir: Path, explicit_review: Optional[str]) -> Path:
    if explicit_review:
        p = Path(explicit_review)
        if not p.is_absolute():
            p = task_dir / p
        if not p.is_file():
            raise FileNotFoundError(f"Review file not found: {p}")
        return p

    reviews = sorted(task_dir.glob("review*.md"), key=lambda p: p.stat().st_mtime)
    if not reviews:
        raise FileNotFoundError(f"No review*.md files found in {task_dir}")
    return reviews[-1]


def build_metrics_payload(
    task_dir: Path,
    review_path: Path,
    tier: Optional[str],
) -> Dict[str, object]:
    review_text = review_path.read_text(encoding="utf-8", errors="ignore")
    verdict, tree_hash, health_scores, blockers_count, notes_count = parse_review_summary(review_text)

    if tier and tier not in VALID_TIERS:
        raise ValueError(f"Invalid --tier {tier!r}; expected one of {sorted(VALID_TIERS)}")

    return {
        "schema_version": 1,
        "task_slug": task_dir.name,
        "tier": tier,
        "source_review": review_path.name,
        "verdict": verdict,
        "tree": tree_hash,
        "health_scores": health_scores,
        "active_blockers_count": blockers_count,
        "suggestions_or_notes_count": notes_count,
        "counts": {
            "briefs": len(list(task_dir.glob("brief-*.md"))),
            "handoffs": len(list(task_dir.glob("handoff-*.md"))),
            "reviews": len(list(task_dir.glob("review*.md"))),
            "dispositions": len(list(task_dir.glob("disposition-*.md"))),
        },
        "recorded_at_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def month_bucket(task_slug: str) -> str:
    m = re.match(r"^(\d{4}-\d{2})-", task_slug)
    if m:
        return m.group(1)
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m")


def write_metrics(task_dir: Path, review_path: Path, tier: Optional[str], metrics_root: Path) -> Path:
    payload = build_metrics_payload(task_dir, review_path, tier)
    out_dir = metrics_root / month_bucket(task_dir.name)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{task_dir.name}.json"
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out_path


def run_self_test() -> int:
    assert normalize_verdict("`VERDICT: PASS`\n**Health Score:** 98/100") == "PASS"
    assert normalize_verdict("**APPROVE.** No blocking findings.") == "PASS"
    assert normalize_verdict("VERDICT: APPROVED\n") == "PASS"
    assert normalize_verdict("## VERDICT\n\n**APPROVE（无阻塞）**\n") == "PASS"
    assert normalize_verdict("VERDICT: CHANGES REQUESTED\n- B-1: broken") == "NEEDS_CHANGES"
    assert normalize_verdict("VERDICT: NEEDS_CHANGES\n- B-1: broken") == "NEEDS_CHANGES"
    assert normalize_verdict("VERDICT: FAIL\n- B-1: broken") == "NEEDS_CHANGES"

    for bad in [
        "Looks fine maybe",
        "VERDICT: PARTIAL_OK",
        "VERDICT: APPROVE_WITH_CHANGES\n- B-1: must fix",
        "VERDICT: PASSED_WITH_BLOCKERS\n- B-1: must fix",
        "# Pass 2 review of foo\n- B-1: broken auth",
        "",
    ]:
        try:
            normalize_verdict(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"Expected ValueError for malformed verdict: {bad!r}")

    _, _, hs1, b1, _ = parse_review_summary("VERDICT: PASS\n**Health Score:** 100/100\n- B-1: lingering blocker")
    assert hs1 == [{"scope": "overall", "score": 100}]
    assert b1 == 1
    for tricky_blocker in (
        "VERDICT: PASS\nBLOCKING:\n1. B-1: admin page calls /api/users\n",
        "VERDICT: PASS\nBLOCKING:\n- B-1，admin page calls /api/users\n",
        "VERDICT: PASS\nBLOCKING:\n| B-1 | admin calls /api/users | blocker |\n",
        "VERDICT: PASS\nBLOCKING:\n- B-1: 部分修复，client-side guard\n",
        "VERDICT: PASS\n- [ ] B-1: still broken\n",
        "VERDICT: PASS\n> B-1: still broken\n",
        "VERDICT: PASS\n• B-1: still broken\n",
        "VERDICT: PASS\n- B-1: FIXED? no, still broken\n",
    ):
        _, _, _, tb, _ = parse_review_summary(tricky_blocker)
        assert tb == 1, f"Expected active_b=1 for {tricky_blocker!r}, got {tb}"
    _, _, _, tb_ok, _ = parse_review_summary("VERDICT: PASS\nEVIDENCE:\n- B-1: FIXED (review-1)\n")
    assert tb_ok == 0, f"Expected active_b=0 for structured resolved B-1, got {tb_ok}"
    _, _, hs2, _, _ = parse_review_summary("VERDICT: PASS\nHealth Score: web-api 80/100；mobile-app 95/100")
    assert hs2 == [{"scope": "web-api", "score": 80}, {"scope": "mobile-app", "score": 95}]

    tmp = Path(tempfile.mkdtemp(prefix="metrics-self-test-"))
    try:
        tdir = tmp / ".sop" / "tasks" / "2026-11-17-sample-task"
        tdir.mkdir(parents=True)
        (tdir / "brief-writer.md").write_text("brief\n", encoding="utf-8")
        (tdir / "handoff-1.md").write_text("handoff\n", encoding="utf-8")
        rpath = tdir / "review-1.md"
        rpath.write_text(
            "# Review\n**VERDICT:** APPROVED\nTREE: tree=deadbeef1234\nHealth Score: 100/100\n- N-1: minor note\n",
            encoding="utf-8",
        )
        out = write_metrics(tdir, rpath, "T2_HIGH_RISK", tmp / ".sop" / "metrics")
        saved = json.loads(out.read_text(encoding="utf-8"))
        assert saved["verdict"] == "PASS"
        assert saved["tree"] == "deadbeef1234"
        assert saved["health_scores"] == [{"scope": "overall", "score": 100}]
        assert saved["suggestions_or_notes_count"] == 1
        assert saved["counts"] == {"briefs": 1, "handoffs": 1, "reviews": 1, "dispositions": 0}
        assert out.parent.name == "2026-11"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print("ALL record-metrics.py SELF-TESTS PASSED")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Record externalized review & dispatch metrics.")
    parser.add_argument("--task-dir", help="Path to SOP task directory")
    parser.add_argument("--sop-root", help="SOP root directory (auto-discovered when omitted)")
    parser.add_argument("--review", help="Specific review markdown filename or path (defaults to latest review*.md)")
    parser.add_argument("--tier", choices=sorted(VALID_TIERS), help="Deterministic task risk tier")
    parser.add_argument("--metrics-root", help="Output metrics directory (auto-discovered when omitted)")
    parser.add_argument("--self-test", action="store_true", help="Run internal self-tests and exit")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    if not args.task_dir:
        parser.error("--task-dir is required unless --self-test is set")

    sop_root = SC.find_sop_root(
        explicit_root=Path(args.sop_root) if args.sop_root else None,
        task_dir=Path(args.task_dir),
    )
    ws = SC.load_workspace(sop_root)
    task_dir = SC.resolve_task_dir(args.task_dir, sop_root)
    if not task_dir.is_dir():
        print(f"ERROR: task directory not found: {task_dir}")
        return 2

    metrics_root = Path(args.metrics_root).expanduser().resolve() if args.metrics_root else Path(ws["metrics_dir"])  # type: ignore[arg-type]
    try:
        review_path = pick_latest_review(task_dir, args.review)
        out_path = write_metrics(task_dir, review_path, args.tier, metrics_root)
    except (FileNotFoundError, ValueError) as err:
        print(f"ERROR: {err}")
        return 2

    print(str(out_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

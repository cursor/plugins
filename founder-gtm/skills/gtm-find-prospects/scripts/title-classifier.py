#!/usr/bin/env python3
"""Classify a list of job titles into persona buckets.

Keyword-list + exclusion-regex approach. Lifted from how Cursor's growth
team classifies titles for outbound (`golden_list_scripts`), genericized.

No API key, no LLM. Fast and deterministic. Founders tune buckets by
editing the data files, not Python:
    ../data/title-keywords.txt  , bucket definitions
    ../data/title-exclusions.txt, global "always drop" regex list

Usage:
    python title-classifier.py --input prospects.csv --title-col role \\
        --out prospects_classified.csv

    # Inspect what's in your data with no filter:
    python title-classifier.py --input prospects.csv --title-col role --print-misses
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path
from typing import Iterable

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
DEFAULT_KEYWORDS_FILE = DATA_DIR / "title-keywords.txt"
DEFAULT_EXCLUSIONS_FILE = DATA_DIR / "title-exclusions.txt"


def load_buckets(path: Path) -> list[tuple[str, list[str], list[str]]]:
    """Parse title-keywords.txt into [(bucket_name, includes, excludes)]."""
    buckets: list[tuple[str, list[str], list[str]]] = []
    for raw in _iter_lines(path):
        parts = raw.split("|")
        if len(parts) < 2:
            continue
        name = parts[0].strip()
        includes = [k.strip() for k in parts[1].split(",") if k.strip()]
        excludes = (
            [k.strip() for k in parts[2].split(",") if k.strip()]
            if len(parts) > 2
            else []
        )
        if name and includes:
            buckets.append((name, includes, excludes))
    return buckets


def load_exclusion_regex(path: Path) -> re.Pattern[str] | None:
    patterns: list[str] = []
    for raw in _iter_lines(path):
        patterns.append(raw)
    if not patterns:
        return None
    combined = "|".join(f"(?:{p})" for p in patterns)
    try:
        return re.compile(combined, re.IGNORECASE)
    except re.error as e:
        print(f"warn: failed to compile exclusion regex: {e}", file=sys.stderr)
        return None


def _iter_lines(path: Path) -> Iterable[str]:
    if not path.exists():
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            yield line


def classify(
    title: str,
    buckets: list[tuple[str, list[str], list[str]]],
    excluder: re.Pattern[str] | None,
) -> tuple[str | None, list[str], str | None]:
    """Return (bucket_or_None, matched_keywords, exclusion_reason_or_None)."""
    if not title:
        return None, [], None
    t = title.lower()
    if excluder:
        m = excluder.search(t)
        if m:
            return None, [], f"excluded:{m.group(0).strip()}"
    for bucket, includes, excludes in buckets:
        if any(ex.lower() in t for ex in excludes):
            continue
        matched = [kw for kw in includes if kw.lower() in t]
        if matched:
            return bucket, matched, None
    return None, [], None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--title-col", default="role")
    parser.add_argument("--out", default="-")
    parser.add_argument(
        "--keywords-file",
        default=str(DEFAULT_KEYWORDS_FILE),
        help="Path to title-keywords.txt",
    )
    parser.add_argument(
        "--exclusions-file",
        default=str(DEFAULT_EXCLUSIONS_FILE),
        help="Path to title-exclusions.txt",
    )
    parser.add_argument(
        "--print-misses",
        action="store_true",
        help="Print titles that matched no bucket to stderr (for tuning buckets).",
    )
    parser.add_argument(
        "--only-matched",
        action="store_true",
        help="Only output rows that matched a bucket.",
    )
    args = parser.parse_args()

    buckets = load_buckets(Path(args.keywords_file))
    excluder = load_exclusion_regex(Path(args.exclusions_file))
    if not buckets:
        print(
            f"error: no buckets loaded from {args.keywords_file}. "
            "Did you edit it for your ICP?",
            file=sys.stderr,
        )
        return 1

    try:
        with open(args.input, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if args.title_col not in (reader.fieldnames or []):
                print(
                    f"error: column '{args.title_col}' not in {reader.fieldnames}",
                    file=sys.stderr,
                )
                return 1
            input_rows = list(reader)
            input_fields = reader.fieldnames or []
    except FileNotFoundError:
        print(f"error: input file not found: {args.input}", file=sys.stderr)
        return 1

    out_fields = list(input_fields) + [
        "persona_bucket",
        "persona_confidence",
        "matched_keywords",
        "exclusion_reason",
    ]
    matched_rows: list[dict] = []
    misses: list[str] = []
    matched_count = 0
    excluded_count = 0

    for row in input_rows:
        title = row.get(args.title_col, "") or ""
        bucket, kws, exclusion = classify(title, buckets, excluder)
        confidence = "high" if len(kws) >= 2 else ("medium" if kws else "low")
        row = dict(row)
        if bucket:
            row["persona_bucket"] = bucket
            row["persona_confidence"] = confidence
            row["matched_keywords"] = "|".join(kws)
            row["exclusion_reason"] = ""
            matched_count += 1
        elif exclusion:
            row["persona_bucket"] = ""
            row["persona_confidence"] = ""
            row["matched_keywords"] = ""
            row["exclusion_reason"] = exclusion
            excluded_count += 1
            if args.only_matched:
                continue
        else:
            row["persona_bucket"] = ""
            row["persona_confidence"] = ""
            row["matched_keywords"] = ""
            row["exclusion_reason"] = ""
            if title and args.print_misses:
                misses.append(title)
            if args.only_matched:
                continue
        matched_rows.append(row)

    out_stream = (
        sys.stdout if args.out == "-" else open(args.out, "w", newline="", encoding="utf-8")
    )
    try:
        writer = csv.DictWriter(out_stream, fieldnames=out_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(matched_rows)
    finally:
        if out_stream is not sys.stdout:
            out_stream.close()

    print(
        f"classified {len(input_rows)} titles. matched: {matched_count}. "
        f"excluded: {excluded_count}. misses: {len(input_rows) - matched_count - excluded_count}.",
        file=sys.stderr,
    )
    if args.print_misses and misses:
        print("\n--- top 25 misses (consider adding to buckets) ---", file=sys.stderr)
        for t in misses[:25]:
            print(t, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

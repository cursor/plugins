#!/usr/bin/env python3
"""Compute a domain histogram from a CSV containing email addresses.

Separates work domains from personal (gmail, yahoo, etc.) so you can focus
outreach on people using a company email. Useful for webinar attendee
exports, event signup lists, or any CSV with an email column.

Usage:
    python domain_histogram.py --input attendees.csv --email-col email --out domains.csv
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import Counter, defaultdict

from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_PERSONAL_DOMAINS_FILE = SCRIPT_DIR.parent / "data" / "personal-email-domains.txt"


def load_personal_domains(path: Path) -> set[str]:
    if not path.exists():
        return set()
    domains: set[str] = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip().lower()
            if line and not line.startswith("#"):
                domains.add(line)
    return domains


EMAIL_RE = re.compile(r"[\w.+\-]+@([\w.-]+\.[A-Za-z]{2,})")


def domain_of(email: str) -> str | None:
    m = EMAIL_RE.search(email or "")
    return m.group(1).lower() if m else None


def kind(domain: str, personal_domains: set[str]) -> str:
    return "personal" if domain in personal_domains else "work"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Input CSV path")
    parser.add_argument("--email-col", default="email", help="Column name containing the email")
    parser.add_argument("--min-count", type=int, default=1, help="Minimum count to include in output")
    parser.add_argument(
        "--personal-domains-file",
        default=str(DEFAULT_PERSONAL_DOMAINS_FILE),
        help="Path to personal-email-domains.txt",
    )
    parser.add_argument("--out", default="-")
    args = parser.parse_args()

    personal_domains = load_personal_domains(Path(args.personal_domains_file))
    counter: Counter[str] = Counter()
    samples: dict[str, list[str]] = defaultdict(list)

    try:
        with open(args.input, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if args.email_col not in (reader.fieldnames or []):
                print(
                    f"error: column '{args.email_col}' not in {reader.fieldnames}",
                    file=sys.stderr,
                )
                return 1
            for row in reader:
                email = (row.get(args.email_col) or "").strip()
                d = domain_of(email)
                if not d:
                    continue
                counter[d] += 1
                if len(samples[d]) < 3:
                    samples[d].append(email)
    except FileNotFoundError:
        print(f"error: input file not found: {args.input}", file=sys.stderr)
        return 1

    rows = [
        {
            "domain": d,
            "count": c,
            "kind": kind(d, personal_domains),
            "sample_addresses": "|".join(samples[d]),
        }
        for d, c in counter.most_common()
        if c >= args.min_count
    ]

    fieldnames = ["domain", "count", "kind", "sample_addresses"]
    out_stream = sys.stdout if args.out == "-" else open(args.out, "w", newline="", encoding="utf-8")
    try:
        writer = csv.DictWriter(out_stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    finally:
        if out_stream is not sys.stdout:
            out_stream.close()

    work = sum(r["count"] for r in rows if r["kind"] == "work")
    personal = sum(r["count"] for r in rows if r["kind"] == "personal")
    print(
        f"wrote {len(rows)} domains to {args.out}. "
        f"Work: {work} addresses; personal: {personal}.",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

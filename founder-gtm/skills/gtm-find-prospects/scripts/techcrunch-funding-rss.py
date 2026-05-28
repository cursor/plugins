#!/usr/bin/env python3
"""Pull recent funding announcements from TechCrunch's venture RSS feed.

Filters by stage keywords (e.g. "Seed", "Series A") and sector keywords found
in the title or description. Writes a CSV of qualifying rounds.

Free. No API key required.

Usage:
    python techcrunch_funding.py \\
        --stages "Seed,Series A" \\
        --keywords "AI,LLM,infrastructure" \\
        --since-days 60 \\
        --out funding.csv
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import feedparser
except ImportError:
    sys.exit("Install feedparser: pip install feedparser")

FEEDS = [
    "https://techcrunch.com/category/venture/feed/",
    "https://techcrunch.com/category/startups/feed/",
]

AMOUNT_RE = re.compile(r"\$([\d.]+)\s*(million|billion|m|b)\b", re.IGNORECASE)
LEAD_RE = re.compile(r"led by ([A-Z][\w &'.,-]+?)(?:\.|,| with| and)", re.IGNORECASE)


def parse_amount(text: str) -> str:
    m = AMOUNT_RE.search(text)
    if not m:
        return ""
    value, unit = m.groups()
    unit_norm = "B" if unit.lower().startswith("b") else "M"
    return f"${value}{unit_norm}"


def parse_lead(text: str) -> str:
    m = LEAD_RE.search(text)
    return m.group(1).strip() if m else ""


def parse_company(title: str) -> str:
    parts = re.split(r"\s+(?:raises|secures|closes|lands|nets)\s+", title, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) == 2:
        return parts[0].strip()
    parts = title.split(",", 1)
    return parts[0].strip()


def matches(text: str, terms: list[str]) -> list[str]:
    text_l = text.lower()
    return [t for t in terms if t.lower() in text_l]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stages", default="Seed,Series A,Series B", help="Comma-separated stage keywords to filter by")
    parser.add_argument("--keywords", default="", help="Comma-separated sector keywords (any match qualifies); leave empty to match all")
    parser.add_argument("--since-days", type=int, default=90)
    parser.add_argument("--out", default="-", help="Output CSV path or '-' for stdout")
    args = parser.parse_args()

    stages = [s.strip() for s in args.stages.split(",") if s.strip()]
    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]
    since = datetime.now(timezone.utc) - timedelta(days=args.since_days)

    rows: list[dict] = []
    seen_urls: set[str] = set()
    for url in FEEDS:
        try:
            feed = feedparser.parse(url)
        except Exception as e:
            print(f"warn: failed to fetch {url}: {e}", file=sys.stderr)
            continue
        for entry in feed.entries:
            link = entry.get("link", "")
            if link in seen_urls:
                continue
            seen_urls.add(link)

            published_raw = entry.get("published_parsed") or entry.get("updated_parsed")
            if not published_raw:
                continue
            published = datetime(*published_raw[:6], tzinfo=timezone.utc)
            if published < since:
                continue

            title = entry.get("title", "")
            summary = entry.get("summary", "")
            blob = f"{title} {summary}"

            stage_hits = matches(blob, stages)
            if not stage_hits:
                continue
            if keywords and not matches(blob, keywords):
                continue

            rows.append({
                "company": parse_company(title),
                "stage": stage_hits[0],
                "amount": parse_amount(blob),
                "lead_investor": parse_lead(blob),
                "date": published.date().isoformat(),
                "keywords_matched": "|".join(matches(blob, keywords)) if keywords else "",
                "title": title,
                "source_url": link,
            })

    rows.sort(key=lambda r: r["date"], reverse=True)
    fieldnames = ["company", "stage", "amount", "lead_investor", "date", "keywords_matched", "title", "source_url"]
    out_stream = sys.stdout if args.out == "-" else open(args.out, "w", newline="", encoding="utf-8")
    try:
        writer = csv.DictWriter(out_stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    finally:
        if out_stream is not sys.stdout:
            out_stream.close()

    print(f"wrote {len(rows)} rounds to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

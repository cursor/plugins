#!/usr/bin/env python3
"""Pull recent "Show HN" launches from Hacker News' Algolia API.

Free. No API key required.

Usage:
    python show_hn.py --keywords "AI,LLM,devtools" --since-days 30 --out launches.csv
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Install requests: pip install requests")

ALGOLIA = "https://hn.algolia.com/api/v1/search_by_date"


def fetch_show_hn(since_days: int) -> list[dict]:
    since = int((datetime.now(timezone.utc) - timedelta(days=since_days)).timestamp())
    out: list[dict] = []
    page = 0
    while True:
        params = {
            "tags": "show_hn",
            "numericFilters": f"created_at_i>={since}",
            "hitsPerPage": 100,
            "page": page,
        }
        r = requests.get(ALGOLIA, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        hits = data.get("hits", [])
        if not hits:
            break
        out.extend(hits)
        if page + 1 >= data.get("nbPages", 1):
            break
        page += 1
    return out


def parse_company(title: str) -> str:
    t = re.sub(r"^Show HN:\s*", "", title, flags=re.IGNORECASE).strip()
    m = re.match(r"^([A-Za-z0-9.\-_ &]{2,30})(?:\s+[-–—:|]|\s+is\b|\s+\(|,)", t)
    if m:
        return m.group(1).strip()
    return t.split(" ")[0]


def matches(text: str, terms: list[str]) -> list[str]:
    text_l = text.lower()
    return [t for t in terms if t.lower() in text_l]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keywords", default="", help="Comma-separated; any match qualifies. Empty = all Show HNs.")
    parser.add_argument("--since-days", type=int, default=30)
    parser.add_argument("--min-points", type=int, default=0)
    parser.add_argument("--out", default="-")
    args = parser.parse_args()

    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]

    try:
        hits = fetch_show_hn(args.since_days)
    except requests.RequestException as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    rows: list[dict] = []
    for h in hits:
        title = h.get("title") or ""
        blob = f"{title} {h.get('story_text') or ''}"
        if keywords and not matches(blob, keywords):
            continue
        if (h.get("points") or 0) < args.min_points:
            continue
        rows.append({
            "title": title,
            "company": parse_company(title),
            "url": h.get("url") or "",
            "hn_url": f"https://news.ycombinator.com/item?id={h.get('objectID')}",
            "date": datetime.fromtimestamp(h.get("created_at_i", 0), tz=timezone.utc).date().isoformat(),
            "points": h.get("points") or 0,
            "comments": h.get("num_comments") or 0,
            "author": h.get("author") or "",
            "keywords_matched": "|".join(matches(blob, keywords)) if keywords else "",
        })

    rows.sort(key=lambda r: (r["date"], r["points"]), reverse=True)
    fieldnames = ["title", "company", "url", "hn_url", "date", "points", "comments", "author", "keywords_matched"]
    out_stream = sys.stdout if args.out == "-" else open(args.out, "w", newline="", encoding="utf-8")
    try:
        writer = csv.DictWriter(out_stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    finally:
        if out_stream is not sys.stdout:
            out_stream.close()

    print(f"wrote {len(rows)} launches to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

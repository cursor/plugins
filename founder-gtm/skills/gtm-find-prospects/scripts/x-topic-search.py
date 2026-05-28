#!/usr/bin/env python3
"""Find people on X posting about a topic, via the local xmcp MCP server.

Requires the xmcp MCP server running at http://127.0.0.1:8000/mcp with
OAuth1 user-context configured. See ~/dev/xmcp/CURSOR_SETUP.md.

Uses xmcp's `searchPostsRecent` tool, ranks results by engagement + recency,
and outputs a CSV.

Usage:
    python xmcp_topic_search.py \\
        --query '("AI evals" OR "LLM testing") -is:retweet' \\
        --since-days 14 \\
        --min-faves 5 \\
        --out x_prospects.csv
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from datetime import datetime, timedelta, timezone

try:
    from mcp import ClientSession
    from mcp.client.streamable_http import streamablehttp_client
except ImportError:
    sys.exit("Install mcp: pip install mcp")

XMCP_URL = "http://127.0.0.1:8000/mcp"


async def run_search(query: str, since_days: int, max_results: int) -> list[dict]:
    start_time = (
        datetime.now(timezone.utc) - timedelta(days=since_days)
    ).isoformat(timespec="seconds").replace("+00:00", "Z")

    async with streamablehttp_client(XMCP_URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(
                "searchPostsRecent",
                {
                    "query": query,
                    "max_results": min(max_results, 100),
                    "start_time": start_time,
                    "tweet.fields": "created_at,public_metrics,author_id,lang",
                    "expansions": "author_id",
                    "user.fields": "username,name,description,public_metrics",
                },
            )

    payload = next(
        (c.text for c in result.content if hasattr(c, "text") and c.text), None
    )
    if not payload:
        return []
    import json
    data = json.loads(payload)
    tweets = data.get("data", []) or []
    users_by_id = {u["id"]: u for u in (data.get("includes", {}).get("users") or [])}

    rows: list[dict] = []
    for t in tweets:
        author_id = t.get("author_id")
        user = users_by_id.get(author_id, {})
        metrics = t.get("public_metrics") or {}
        rows.append({
            "handle": "@" + user.get("username", ""),
            "name": user.get("name", ""),
            "bio": (user.get("description") or "").replace("\n", " "),
            "followers": (user.get("public_metrics") or {}).get("followers_count", 0),
            "last_post_excerpt": (t.get("text") or "").replace("\n", " ")[:240],
            "last_post_date": (t.get("created_at") or "")[:10],
            "post_id": t.get("id"),
            "faves": metrics.get("like_count", 0),
            "replies": metrics.get("reply_count", 0),
            "reposts": metrics.get("retweet_count", 0),
        })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--query", required=True, help="X search query (see https://docs.x.com/x-api/posts/search/integrate/build-a-query)")
    parser.add_argument("--since-days", type=int, default=7, help="Recent search supports up to 7 days on free tier")
    parser.add_argument("--min-faves", type=int, default=0)
    parser.add_argument("--max-results", type=int, default=100)
    parser.add_argument("--out", default="-")
    args = parser.parse_args()

    try:
        rows = asyncio.run(run_search(args.query, args.since_days, args.max_results))
    except ConnectionError:
        print(
            "error: xmcp MCP server not reachable at " + XMCP_URL + ". "
            "Start it with ~/dev/xmcp/start.sh",
            file=sys.stderr,
        )
        return 2
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    rows = [r for r in rows if r["faves"] >= args.min_faves]
    rows.sort(key=lambda r: (r["faves"], r["last_post_date"]), reverse=True)

    seen: set[str] = set()
    deduped: list[dict] = []
    for r in rows:
        if r["handle"] in seen:
            continue
        seen.add(r["handle"])
        deduped.append(r)

    fieldnames = ["handle", "name", "bio", "followers", "last_post_excerpt", "last_post_date", "post_id", "faves", "replies", "reposts"]
    out_stream = sys.stdout if args.out == "-" else open(args.out, "w", newline="", encoding="utf-8")
    try:
        writer = csv.DictWriter(out_stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(deduped)
    finally:
        if out_stream is not sys.stdout:
            out_stream.close()

    print(f"wrote {len(deduped)} unique authors to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

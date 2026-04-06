---
name: search-patterns
description: Search for similar historical chart patterns by ticker and date
tools:
  - chartlibrary.search_pattern
  - chartlibrary.get_follow_through
  - chartlibrary.get_pattern_summary
---

# Search Historical Chart Patterns

Use the Chart Library MCP to find historically similar chart patterns and see what happened next.

## When to use

- User asks about a stock's chart pattern
- User wants to know what happened historically after a similar setup
- User asks "what does the chart look like?" or "find similar patterns"

## Steps

1. Call `search_pattern` with the ticker symbol and date
2. Call `get_follow_through` to see 1/3/5/10-day forward returns from the matches
3. Call `get_pattern_summary` for a plain-English summary of the pattern analysis

## Example

"Find similar historical patterns to NVDA on 2026-04-01"

```
search_pattern(symbol="NVDA", date="2026-04-01")
get_follow_through(symbol="NVDA", date="2026-04-01")
get_pattern_summary(symbol="NVDA", date="2026-04-01")
```

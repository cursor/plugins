---
name: market-intelligence
description: Get market intelligence including anomalies, sector rotation, and correlation shifts
tools:
  - chartlibrary.get_anomaly
  - chartlibrary.get_sector_rotation
  - chartlibrary.get_correlation_shift
  - chartlibrary.get_scenario
---

# Market Intelligence

Use Chart Library's market intelligence tools for regime-aware analysis.

## When to use

- User asks about unusual market activity or anomalies
- User wants sector rotation analysis
- User asks "what if SPY drops 3%?" type scenario questions
- User wants to know which stocks are decorrelating from the market

## Tools

- `get_anomaly(symbol)` — Detect unusual pattern activity for a stock
- `get_sector_rotation()` — Current sector ETF rankings by relative strength
- `get_correlation_shift()` — Find stocks decorrelating from SPY
- `get_scenario(condition)` — Conditional forward returns ("what if X happens?")

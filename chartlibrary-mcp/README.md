# Chart Library MCP

Historical chart pattern search engine for AI agents. Search 24M+ embeddings across 15K+ symbols and 10 years of market data.

## What it does

- **Pattern Search**: Find the 10 most similar historical chart patterns for any ticker + date
- **Forward Returns**: See what happened 1, 3, 5, and 10 days after each historical match
- **Market Intelligence**: Anomaly detection, volume profiles, sector rotation, correlation shifts
- **Trading Intelligence**: Regime-aware win rates, pattern degradation, exit signals

## 19 MCP Tools

| Category | Tools |
|----------|-------|
| Core Search | `search_pattern`, `search_by_screenshot`, `get_follow_through`, `get_fan_chart`, `get_pattern_summary`, `get_distribution`, `get_trade_simulator` |
| Market Intelligence | `get_anomaly`, `get_volume_profile`, `get_sector_rotation`, `get_crowding`, `get_earnings_reaction`, `get_correlation_shift`, `get_scenario` |
| Trading Intelligence | `get_regime_win_rates`, `get_pattern_degradation`, `get_exit_signal`, `get_risk_adjusted_picks` |
| Utility | `get_health` |

## Installation

```bash
pip install chartlibrary-mcp
```

Or via uvx (no install needed):

```bash
uvx chartlibrary-mcp
```

## Configuration

Get a free API key (200 calls/day) at [chartlibrary.io/developers](https://chartlibrary.io/developers).

Set the `CHART_LIBRARY_API_KEY` environment variable, or the plugin will use the sandbox tier automatically.

## Links

- Website: [chartlibrary.io](https://chartlibrary.io)
- GitHub: [github.com/grahammccain/chart-library-mcp](https://github.com/grahammccain/chart-library-mcp)
- PyPI: [pypi.org/project/chartlibrary-mcp](https://pypi.org/project/chartlibrary-mcp/)
- API Docs: [chartlibrary.io/developers](https://chartlibrary.io/developers)

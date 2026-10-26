# TraderWAI Charts

Cursor plugin that connects agents to [TraderWAI](https://traderwai.com) through TraderWAI's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Live market charts, exact OHLC data, charts marked with the AI's analysis, and strategy backtests for forex, gold, indices, oil, futures, and crypto, plus a read-only view of the broker accounts and positions you connected in TraderWAI (MetaTrader, cTrader, TradeLocker, Match-Trader, DXtrade, Capital.com, Binance, Bybit).

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **TraderWAI Charts**.
3. Click **Install**, then complete the TraderWAI sign-in prompt (Google sign-in, free account).

Or run `/add-plugin traderwai` in chat.

## MCP

```json
{
  "mcpServers": {
    "traderwai": {
      "type": "http",
      "url": "https://mcp.traderwai.com/charts/v2"
    }
  }
}
```

Auth is OAuth. Cursor prompts for TraderWAI sign-in when the plugin connects — there is no API key to configure.

## Try it

- "XAU_USD H1 chart"
- "Mark levels on EUR_USD H4"
- "My positions"

## Notes

- Read-only: the server places no orders and makes no payments.
- Broker data reflects only the accounts the user connected in TraderWAI.
- The hosted runtime is the source of truth for tool names and schemas.

## Docs

- TraderWAI: https://traderwai.com
- Server URL: https://mcp.traderwai.com/charts/v2
- Support: info@traderwai.com

## License

MIT

# Zerodha Kite

Cursor plugin that connects agents to [Zerodha Kite](https://kite.zerodha.com/) through Zerodha's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Review holdings, positions, margins, orders, trades, and market data from your Zerodha account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Zerodha Kite**.
3. Click **Install**, then follow the Kite authorization prompt.

Or run `/add-plugin zerodha-kite` in chat.

## MCP

```json
{
  "mcpServers": {
    "zerodha-kite": {
      "type": "http",
      "url": "https://mcp.kite.trade/mcp"
    }
  }
}
```

The hosted MCP does not require a Kite Connect API key. Its login tool opens Zerodha's external authorization flow, where you sign in to Kite and complete two-factor authentication. Your Zerodha credentials are not added to this plugin or sent as MCP headers.

## Before you connect

You need an active Zerodha trading account with two-factor authentication enabled.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Account | View the signed-in profile and account margins |
| Portfolio | Review holdings, positions, and mutual fund investments |
| Orders | Read orders, trades, and order execution history |
| Market data | Search instruments and retrieve quotes, LTP, OHLC, and historical data |
| GTT | View and manage Good Till Triggered orders |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Zerodha hosts the server; this plugin does not wrap a local stdio server.
- The hosted service excludes regular order placement, modification, and cancellation. Zerodha documents GTT orders as the exception.
- Tool calls operate on the Zerodha account authorized during the Kite login flow.

## Docs

- Zerodha Kite MCP: https://mcp.kite.trade/
- Kite MCP source: https://github.com/zerodha/kite-mcp-server
- Kite Connect API: https://kite.trade/docs/connect/v3/
- Server URL: https://mcp.kite.trade/mcp

Logo is Zerodha's official icon, sourced from Zerodha's `fourthcross.tech` GitHub repository.

## License

MIT

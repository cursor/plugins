# Webull

Cursor plugin that connects agents to [Webull](https://developer.webull.com/apis/docs/AI-friendly-Resources/mcp/) through Webull's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

View accounts, positions, orders, watchlists, and market data.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Webull**.
3. Click **Install**, then complete the Webull sign-in prompt.

Or run `/add-plugin webull` in chat.

## MCP

```json
{
  "mcpServers": {
    "webull": {
      "type": "http",
      "url": "https://api.webull.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Webull sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Webull account. During sign-in you choose which accounts and capability groups (account info, order query, market data, security master) to expose.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | Balances, account list, and positions |
| Orders | Open orders, order history, and order detail |
| Market data | Stocks, crypto, futures, and event contracts: quotes, bars, ticks, rankings |
| Research | Company profiles, analyst ratings, filings, financial statements, and fund data |
| Watchlists | Create and manage watchlists |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The hosted server is read-only for trading: order placement, modification, and cancellation are only in Webull's local MCP server.
- Hong Kong accounts use a separate regional endpoint that this plugin does not configure.

## Docs

- Webull Cloud MCP: https://developer.webull.com/apis/docs/AI-friendly-Resources/mcp/
- Server URL: https://api.webull.com/mcp

Logo is Webull's official mark.

## License

MIT

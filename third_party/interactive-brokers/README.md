# Interactive Brokers

Cursor plugin that connects agents to [Interactive Brokers](https://www.interactivebrokers.com/en/trading/ai-integrations.php) through Interactive Brokers's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Review positions, balances, P&L, and draft trade instructions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Interactive Brokers**.
3. Click **Install**, then complete the Interactive Brokers sign-in prompt.

Or run `/add-plugin interactive-brokers` in chat.

## MCP

```json
{
  "mcpServers": {
    "interactive-brokers": {
      "type": "http",
      "url": "https://api.ibkr.com/v1/api/mcp-public"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Interactive Brokers sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need an Interactive Brokers account. You authorize one specific account during sign-in. Not available to clients in India or Japan.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | Balances, summaries, positions, and portfolio allocation |
| Activity | Orders, trades, and historical transactions |
| Market data | Price snapshots and history; contract search |
| Instructions | Draft trade instructions for review in IBKR's AI Instructions tab |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Trade instructions never become live orders automatically; you review and submit them inside an IBKR platform.
- IBKR recommends the `mcp-public` endpoint for custom clients; Grok's catalog lists `/mcp`, which shares the same authorization server.
- Revoke access from **Client Portal → Settings → Manage Third-Party Consents**.

## Docs

- IBKR AI integrations: https://www.interactivebrokers.com/en/trading/ai-integrations.php
- Server URL: https://api.ibkr.com/v1/api/mcp-public

Logo is Interactive Brokers's official mark.

## License

MIT

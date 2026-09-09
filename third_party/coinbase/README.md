# Coinbase

Cursor plugin that connects agents to [Coinbase](https://docs.cdp.coinbase.com/coinbase-for-agents/overview) through Coinbase's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Check balances, get quotes, and preview or place trades.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Coinbase**.
3. Click **Install**, then complete the Coinbase sign-in prompt.

Or run `/add-plugin coinbase` in chat.

## MCP

```json
{
  "mcpServers": {
    "coinbase": {
      "type": "http",
      "url": "https://agents.coinbase.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Coinbase sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Coinbase account with Advanced Trade. Coinbase recommends scoping the agent to a dedicated portfolio.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Market data | Products, tickers, order books, and candles |
| Orders | Preview, create, edit, cancel, and list orders; close positions |
| Portfolios | Balances, portfolio breakdowns, and transfers between portfolios |
| Conversions | Quote and execute USDC/USD conversions |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Orders placed through this server are live. Preview first and keep the agent in an isolated portfolio.
- This is Coinbase for Agents, not the separate Agentic Wallet / x402 payments MCP.

## Docs

- Coinbase for Agents: https://docs.cdp.coinbase.com/coinbase-for-agents/overview
- Server URL: https://agents.coinbase.com/mcp

Logo is Coinbase's official mark, from the `coinbase` GitHub organization.

## License

MIT

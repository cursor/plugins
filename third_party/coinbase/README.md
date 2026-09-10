# Coinbase

Cursor plugin that connects agents to [Coinbase](https://docs.cdp.coinbase.com/coinbase-for-agents/overview) through Coinbase's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Check balances, get quotes, and preview or place trades.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Coinbase**.
3. Click **Install**, then follow **Setup** below.

Or run `/add-plugin coinbase` in chat.

## MCP

```json
{
  "mcpServers": {
    "coinbase": {
      "url": "https://agents.coinbase.com/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}"
      }
    }
  }
}
```

## Setup

Coinbase's authorization server (`login.coinbase.com`) does not support dynamic client registration, so an OAuth client has to be registered before anyone can connect.

1. In the [Coinbase Developer Platform portal](https://portal.cdp.coinbase.com/), create an OAuth client and enable the Coinbase for Agents (`mcp:*`) scopes you want to expose.
2. Register both redirect URIs on that client:
   - Desktop: `http://localhost:8787/callback`
   - Web and Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`
3. In **Dashboard → Plugins → Configure**, set **Coinbase OAuth Client ID** and **Coinbase OAuth Client Secret** from that client.
4. Complete the Coinbase login when Cursor prompts.

On a team marketplace an admin sets the client ID and secret once for everyone; each member still completes their own Coinbase login, so tool calls run against that member's account. Coinbase recommends scoping the agent to a dedicated portfolio.

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

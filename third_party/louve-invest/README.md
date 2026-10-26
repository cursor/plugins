# Louve Invest

Cursor plugin that connects agents to [Louve Invest](https://louveinvest.com) through Louve Invest's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

View your Louve Invest SCPI and life insurance portfolio, review your transactions, and explore investment simulations.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Louve Invest**.
3. Click **Install**, then complete the Louve Invest sign-in prompt.

Or run `/add-plugin louve-invest` in chat.

## MCP

```json
{
  "mcpServers": {
    "louve-invest": {
      "type": "http",
      "url": "https://app.louveinvest.com/mcp"
    }
  }
}
```

## Before you connect

You need a Louve Invest account. Portfolio and transaction tools return empty results until the account has completed identity verification (KYC) and holds shares.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Portfolio | View SCPI and life insurance holdings |
| Transactions | Review your transaction history and record external transactions |
| Simulations | Explore investment simulations |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server is read-only apart from simulations and external transactions. It cannot place, modify, or cancel buy or sell orders, payments, subscriptions, or withdrawals; those require a signature in the Louve Invest web app.

## Docs

- Louve Invest: https://louveinvest.com
- Server URL: https://app.louveinvest.com/mcp

The logo references the URL Louve Invest submitted (`https://app.louveinvest.com/img/icons/louve.svg`). Louve Invest's hosts could not be reached when this plugin was added, so no local copy was committed.

## License

MIT

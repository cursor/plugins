# Robinhood

Cursor plugin that connects agents to [Robinhood](https://robinhood.com/us/en/support/articles/agentic-trading-overview/) through Robinhood's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server, the Robinhood Trading MCP.

View portfolios, positions, orders, watchlists, and market data, and trade in a Robinhood Agentic account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Robinhood**.
3. Click **Install**, then complete the Robinhood sign-in prompt.

Or run `/add-plugin robinhood` in chat.

## MCP

```json
{
  "mcpServers": {
    "robinhood": {
      "type": "http",
      "url": "https://agent.robinhood.com/mcp/trading"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Robinhood sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Robinhood account. On first sign-in Robinhood prompts you to open a dedicated **Agentic** account; the agent can read data across your accounts but can only place trades in the Agentic account, which you fund separately. Opening the Agentic account and authenticating the agent must be done in a desktop browser.

Crypto trades additionally require a Robinhood Crypto account and are not available in every state (including New York).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | Account list, portfolio snapshot, buying power, realized P&L, and trade history |
| Equities | Positions, tax lots, quotes, order history, tradability checks, and review/place/cancel orders |
| Options | Chains, instruments, quotes, historicals, positions, order history, and review/place/cancel orders |
| Crypto | Currency pairs, quotes, positions, order history, and preview/place/cancel orders |
| Market data | Historical bars, fundamentals, financials, level 2 price book, technical indicators, earnings, and indexes |
| Watchlists | View, create, update, follow, and manage stock, crypto, index, and option watchlists |
| Scanner | Create, configure, and run stock scans |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- **You are responsible for every trade the agent places.** If you instruct the agent to act without asking for approval, it can place orders without confirmation. Use the `review_*` / `preview_*` tools to see pre-trade warnings before placing an order.
- Trading is limited to long equities, options, and crypto in the Agentic account; margin borrowing is not enabled for Agentic accounts.
- Robinhood does not control or audit third-party agents. Review Robinhood's disclosures in the docs below before connecting.

## Docs

- Agentic Trading overview: https://robinhood.com/us/en/support/articles/agentic-trading-overview/
- Trading with your agent (tool list): https://robinhood.com/us/en/support/articles/trading-with-your-agent/
- Server URL: https://agent.robinhood.com/mcp/trading

Logo is Robinhood's official mark.

## License

MIT

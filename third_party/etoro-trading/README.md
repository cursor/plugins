# eToro Trading

Cursor plugin that connects agents to [eToro](https://api-portal.etoro.com/core/vibe-code/cursor) through eToro's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server for the eToro Public API.

View your eToro portfolio, balances, positions, and watchlists, research instruments and traders, and prepare and place trades.

This plugin is for operating an eToro account from chat. For writing code against the eToro Public API, install eToro's own [`etoro`](https://cursor.com/marketplace/etoro) plugin instead, which ships API-building rules, skills, and a documentation search server.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **eToro Trading**.
3. Click **Install**, then complete the eToro sign-in prompt.

Or run `/add-plugin etoro-trading` in chat.

## MCP

```json
{
  "mcpServers": {
    "etoro-trading": {
      "type": "http",
      "url": "https://mcp.public-api.etoro.com"
    }
  }
}
```

Auth is OAuth. Cursor prompts for eToro sign-in when the plugin connects — there is no client ID or API key to configure. Each user signs in with their own eToro account and consents to the scopes the connection may use; the `get-my-profile-and-scopes` tool shows which account is connected and which scopes were granted.

## Before you connect

You need an eToro account. The server operates on both **Demo** (virtual money) and **Real** accounts, and the same tools work against either, so confirm which account type a request targets before letting the agent place a trade.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Portfolio | Full portfolio summary with totals and per-instrument P&L, balances across every account type (Trading, Cash, Crypto, Options, and others), current positions and pending orders including copy-trading mirrors, and closed-trade history |
| Trading | `prepare-trade` validates an order against live eligibility, quotes, costs, and available balance and returns a confirmation block; `place-trade` submits exactly that order and waits for the outcome. `prepare-close` / `place-close` do the same for closing a position |
| Research | Batch overview of up to 100 instruments (price, spread, performance, tradability), public profiles and performance of up to 100 traders for copy-trading research, and the user's watchlists |
| API access | Browse the Public API route catalog by tag or keyword, read any route's OpenAPI spec, and run read or write requests against any route |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- **You are responsible for every trade the agent places.** The server gates trades behind a short-lived confirmation token issued by `prepare-trade` / `prepare-close`, and its tool descriptions instruct the agent to show you the confirmation block and get explicit approval before each `place-*` or `execute-write` call. If you instruct the agent to act without asking, it can still place orders.
- Orders placed on a Real account are live. eToro recommends starting on a Demo account.
- `execute-write` can reach any state-changing route in the Public API, including transfers and social posts, not only trades.

## Docs

- Cursor integration guide: https://api-portal.etoro.com/core/vibe-code/cursor
- Agent skill and server overview: https://api-portal.etoro.com/core/ai-agents/etoro-skill
- API reference: https://api-portal.etoro.com/
- Server URL: https://mcp.public-api.etoro.com

Logo is eToro's official mark.

## License

MIT

# AIsa

Cursor plugin that connects agents to [AIsa](https://aisa.one) through AIsa's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query data APIs across six categories through one account: SEO and AI visibility, finance, social, web search and research, sales, and agent mail. Free calls find and quote the right API, and paid calls are billed per call.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **AIsa**.
3. Click **Install**, then complete the AIsa sign-in prompt.

Or run `/add-plugin aisa` in chat.

## MCP

```json
{
  "mcpServers": {
    "aisa": {
      "type": "http",
      "url": "https://mcp.aisa.one/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE through AIsa's Clerk sign-in (`https://clerk.aisa.one`), with dynamic client registration and the `profile`, `email`, and `offline_access` scopes. The client prompts for AIsa sign-in when the plugin connects. There is no client ID or key to configure.

## Before you connect

You need an AIsa account with balance for paid calls. Some premium endpoints need AIsa's Go-to-Market plan.

## What agents can do

| Category | Capabilities |
| --- | --- |
| SEO and AI visibility | DataForSEO, Semrush, and Ahrefs data |
| Finance | Prices, fundamentals, filings, crypto, and prediction markets |
| Social | X, Instagram, Reddit, Pinterest, and YouTube |
| Search and research | Tavily, Firecrawl, Exa, and Perplexity |
| Sales | Apollo and creator discovery |
| Agent mail | AgentMail |

Core tools: `search` (finds the right API for a task), `batch_get_schema`, `list_categories`, `batch_quote`, `batch_use`, and `account`. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- `search`, schema lookup, `list_categories`, `batch_quote`, and `account` are free. `batch_use` is billed per call. A quote is an estimate, not authorization: when a quote is not eligible to run automatically, the agent should show the planned calls and a USD budget before running them.
- A `402` response means the balance is too low or the plan does not include the endpoint.

## Docs

- AIsa: https://aisa.one
- Server card: https://mcp.aisa.one/.well-known/mcp/server-card.json
- Server URL: https://mcp.aisa.one/mcp

Logo is AIsa's official app icon from aisa.one.

## License

MIT

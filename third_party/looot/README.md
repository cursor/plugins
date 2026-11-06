# looot

Cursor plugin that connects agents to [looot](https://looot.ai) through its remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

looot gives an agent one API key and one prepaid balance for about 2,500 data endpoints from 90+ providers. Agents can find work emails and phones, enrich companies and people, search companies, look up a company's tech stack, run Google SERP and web searches, search news, read web pages, fetch LinkedIn profiles and search local businesses.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **looot**.
3. Click **Install**, then set your looot API key (below).

Or run `/add-plugin looot` in chat.

## MCP

```json
{
  "mcpServers": {
    "looot": {
      "type": "http",
      "url": "https://api.looot.ai/mcp",
      "headers": {
        "Authorization": "Bearer ${LOOOT_API_KEY}"
      }
    }
  }
}
```

Auth is a looot **API key** sent as a Bearer token. Create one at https://looot.ai, then set it in **Dashboard → Plugins → Configure**. Do not commit the key. The server also supports OAuth 2.1 with dynamic client registration for clients that prefer browser sign-in.

## Before you connect

You need a looot account with credit. Billing is prepaid: top up from $5, no subscription, no free tier.

## What agents can do

| Category | Capabilities |
| --- | --- |
| People | Find a work email or phone, verify an email, search people, fetch a LinkedIn profile |
| Companies | Enrich a company, search companies, look up its tech stack, search local businesses |
| Web | Google SERP results, web search, news search, read a web page |
| Account | Check the balance, get a top-up link, list past runs |

The agent sees the price before a call, and a failed call costs nothing. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Site: https://looot.ai
- Docs: https://docs.looot.ai
- MCP bridge and install steps: https://github.com/loootai/looot-mcp
- Server URL: https://api.looot.ai/mcp

## License

MIT

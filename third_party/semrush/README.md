# Semrush

Cursor plugin that connects agents to [Semrush](https://www.semrush.com) through Semrush's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Pull Semrush keyword, backlink, traffic, and competitive-intelligence data into the editor without leaving your work.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Semrush**.
3. Click **Install**, then complete the Semrush sign-in prompt.

Or run `/add-plugin semrush` in chat.

## MCP

```json
{
  "mcpServers": {
    "semrush": {
      "type": "http",
      "url": "https://mcp.semrush.com/v2/mcp"
    }
  }
}
```

Auth is OAuth 2.1 and the client registers itself, so Cursor just prompts for Semrush sign-in when the plugin connects — there is no client ID to configure.

## Before you connect

You need a Semrush plan that includes API units. MCP calls draw down the same API unit balance as the REST APIs, and Trends data additionally depends on your Trends subscription level.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Keywords | Keyword overview, difficulty, related terms, and search volume by database |
| Domains | Domain overview, organic and paid competitors, and traffic estimates |
| Backlinks | Backlink profiles, referring domains, and anchor analysis |
| Trends | Traffic and market data, gated by your Trends subscription level |
| Projects | Read-only access to Projects API v3 |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Access is read-only — the server does not write back to Semrush.
- Streamable HTTP is the only supported transport.
- Every call consumes API units from the account's balance, so prefer specific queries over broad crawls.
- `https://mcp.semrush.com/v1/mcp` is a stale URL that still circulates on aggregator sites. The current endpoint is `/v2/mcp`.

## Docs

- Semrush MCP: https://developer.semrush.com/api/v4/introduction/semrush-mcp/
- Server URL: https://mcp.semrush.com/v2/mcp

Logo is Semrush's official mark, from the `semrush` GitHub organization.

## License

MIT

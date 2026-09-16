# Similarweb

Cursor plugin that connects agents to [Similarweb](https://www.similarweb.com) through Similarweb's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Pull Similarweb digital-intelligence data — website traffic and engagement, competitor comparison, audience demographics, and keyword metrics — for research without leaving the editor.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Similarweb**.
3. Click **Install**, then set your Similarweb API key (below).

Or run `/add-plugin similarweb` in chat.

## MCP

```json
{
  "mcpServers": {
    "similarweb": {
      "type": "http",
      "url": "https://mcp.similarweb.com",
      "headers": {
        "api-key": "${SIMILARWEB_API_KEY}"
      }
    }
  }
}
```

Auth is a Similarweb **API key** sent in an `api-key` header (lowercase, hyphenated — not `Authorization`). Copy it from **Account Settings → Data Tools → REST API**, then set it in **Dashboard → Plugins → Configure**.

## Before you connect

You need a Similarweb subscription with API access — API-only, Business, or Enterprise. Calls debit standard API data credits. If the REST API section is not visible in your account settings, an account admin has to generate the key.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Web metrics | Traffic and engagement, traffic sources, website rank, similar sites, referrals, audience overlap, demographics, technologies, segments, and PPC spend |
| Search metrics | SERP players and SERP clicks |
| App metrics | App install penetration, app store rank, and app details |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the permissions and credit balance attached to the API key.
- Similarweb's own Cursor guide routes through `npx mcp-remote`. That is not necessary — Cursor connects to the remote endpoint directly and sends the `api-key` header, which is the same shape Similarweb documents for Microsoft Copilot Studio.
- Similarweb runs two documentation portals, `docs.similarweb.com` and `developers.similarweb.com`, whose MCP paths drift. Both give the same endpoint.

## Docs

- Similarweb MCP: https://docs.similarweb.com/api-v5/similarweb-mcp
- Similarweb MCP (developer portal): https://developers.similarweb.com/docs/similarweb-mcp
- Cursor integration guide: https://developers.similarweb.com/docs/cursor-mcp-integration
- Server URL: https://mcp.similarweb.com

Logo is Similarweb's official mark, from the `similarweb` GitHub organization.

## License

MIT

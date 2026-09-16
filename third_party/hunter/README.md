# Hunter

Cursor plugin that connects agents to [Hunter](https://hunter.io) through Hunter's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find and verify professional email addresses, list the contacts behind any company domain, discover companies that match a profile, enrich people and companies, and save contacts as leads.

Official Cursor setup: https://hunter.io/agents.md

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Hunter**.
3. Click **Install**, then set your Hunter API key (below).

Or run `/add-plugin hunter` in chat.

## MCP

```json
{
  "mcpServers": {
    "hunter": {
      "type": "http",
      "url": "https://mcp.hunter.io/mcp",
      "headers": {
        "X-API-Key": "${HUNTER_API_KEY}"
      }
    }
  }
}
```

Auth is a Hunter **API key** sent in an `X-API-Key` header. Create one at https://hunter.io/api-keys (Free plan is enough), then set it in **Dashboard → Plugins → Configure**. Do not commit the key.

## Before you connect

You need a Hunter account and an API key. The MCP server is available on all Hunter plans, including the free plan, and uses the plan and credits attached to that key.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Discover | Find companies by industry, size, location, technology, and more, or describe the target in natural language (free, no credits) |
| Domain Search | List the people and email addresses behind a company domain, with department and seniority filters |
| Email Finder | Find a professional's most likely email address from a name and company or domain |
| Email Verifier | Check whether an email address is deliverable and see its confidence score and sources |
| Enrichment | Pull person and company data from an email address or domain |
| Leads | Create, update, and organize leads and lead lists; push leads to a connected CRM |
| Campaigns | Add recipients to campaigns and start outreach sequences |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the permissions and credits attached to the API key. Domain Search, Email Finder, Email Verifier, and Enrichment calls cost credits the same way they do in the Hunter app; Discover is free.
- This plugin follows Hunter's official Cursor packaging: Streamable HTTP at `https://mcp.hunter.io/mcp` with `X-API-Key`. Hunter also documents OAuth for some clients; do not use OAuth for this plugin.
- Hunter's `test-api-key` only works against the REST API; the MCP server rejects it with a 401.
- The `hunter-io/hunter-mcp` GitHub repository is Hunter's old local (stdio) server and is archived. Hunter directs all clients to the remote server above.

## Docs

- Agent setup instructions: https://hunter.io/agents.md
- Hunter MCP: https://hunter.io/mcp
- API keys: https://hunter.io/api-keys
- API reference (MCP section): https://hunter.io/api-documentation/v2#mcp
- Server URL: https://mcp.hunter.io/mcp

Logo is Hunter's official fox mark, from the `hunter-io` GitHub organization.

## License

MIT

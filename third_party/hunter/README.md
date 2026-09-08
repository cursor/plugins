# Hunter

Cursor plugin that connects agents to [Hunter](https://hunter.io) through Hunter's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find and verify professional email addresses, list the contacts behind any company domain, discover companies that match a profile, enrich people and companies, and save contacts as leads in the signed-in Hunter account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Hunter**.
3. Click **Install**, then complete the Hunter sign-in prompt.

Or run `/add-plugin hunter` in chat.

## MCP

```json
{
  "mcpServers": {
    "hunter": {
      "type": "http",
      "url": "https://mcp.hunter.io/mcp"
    }
  }
}
```

Auth is OAuth 2.1 against Hunter with Dynamic Client Registration (DCR) and PKCE. Cursor registers itself and prompts for Hunter sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

You need a Hunter account. The MCP server is available on all Hunter plans, including the free plan, and uses the plan and credits of the account that signs in.

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

- Tool calls run as the Hunter user who authorizes the connection and consume that account's credits. Domain Search, Email Finder, Email Verifier, and Enrichment calls cost credits the same way they do in the Hunter app; Discover is free.
- Hunter also accepts an API key instead of OAuth. To skip the sign-in flow, generate a key at https://hunter.io/api-keys and send it as `"headers": {"X-API-Key": "<YOUR_HUNTER_API_KEY>"}` (or `"Authorization": "Bearer <YOUR_HUNTER_API_KEY>"`). Keep the key out of shared config.
- Hunter's `test-api-key` only works against the REST API; the MCP server rejects it with a 401.
- The `hunter-io/hunter-mcp` GitHub repository is Hunter's old local (stdio) server and is archived. Hunter directs all clients to the remote server above.
- Revoke access at any time from your Hunter account's connected apps.

## Docs

- Hunter MCP: https://hunter.io/mcp
- Agent setup instructions: https://hunter.io/agents.md
- API reference (MCP section): https://hunter.io/api-documentation/v2#mcp
- Server URL: https://mcp.hunter.io/mcp

Logo is Hunter's official fox mark, from the `hunter-io` GitHub organization.

## License

MIT

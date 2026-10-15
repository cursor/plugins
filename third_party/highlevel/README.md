# HighLevel

Cursor plugin that connects agents to [HighLevel](https://www.gohighlevel.com) (also branded LeadConnector) through HighLevel's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find and update CRM data in a HighLevel sub-account — contacts, conversations and messages, opportunities and pipelines, calendars and appointments, payments, blogs, email templates, and social posts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HighLevel**.
3. Click **Install**, then complete the LeadConnector sign-in prompt.

Or run `/add-plugin highlevel` in chat.

## MCP

```json
{
  "mcpServers": {
    "highlevel": {
      "type": "http",
      "url": "https://services.leadconnectorhq.com/mcp/cursor/v2"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration and PKCE. Cursor registers itself and opens the LeadConnector sign-in when the plugin connects: sign in, choose the sub-account (location) to expose, and approve. There is no Private Integration Token or `locationId` header to configure.

## What agents can do

HighLevel's client-specific `/v2` endpoints expose a small set of unified tools that reach the full operation catalog:

| Tool | Purpose |
| --- | --- |
| `list_locations` | List the sub-accounts this connection can use, or return the one bound sub-account |
| `search_operations` | Discover operations by intent, including record searches and create, update, or delete actions |
| `describe_operation` | Inspect an operation's inputs, example payload, required scopes, and safety information |
| `execute_operation` | Run an operation, subject to OAuth scopes, permissions, and built-in safety checks |

Behind those tools sit more than 550 operations across 38 domains, including contacts, conversations and messages, opportunities and pipelines, calendars and appointments, payments, products and store, invoices and estimates, social planner, blogs, emails, forms and surveys, funnels, workflows, Voice AI, custom objects and fields, and users. The operations available depend on the scopes granted.

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server can write as well as read — including sending messages, updating contacts and opportunities, and creating posts. Approve only the access agents need, and test on a non-production sub-account first.
- Every request runs against one sub-account chosen at sign-in. Agencies that install with the multi-sub-account option can switch between the selected sub-accounts in the same chat.
- Sensitive and irreversible operations go through additional confirmation and safety checks.
- This plugin uses HighLevel's Cursor endpoint (`/mcp/cursor/v2`). The universal endpoint (`/mcp/`) exposes a smaller set of named tools.

## Docs

- MCP server help article: https://help.leadconnectorhq.com/support/solutions/articles/155000008185
- Developer docs: https://marketplace.gohighlevel.com/docs/other/mcp/
- Server URL: https://services.leadconnectorhq.com/mcp/cursor/v2

Logo is HighLevel's official arrow mark, taken from the wordmark on gohighlevel.com.

## License

MIT

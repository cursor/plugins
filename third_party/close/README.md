# Close

Cursor plugin that connects agents to [Close](https://close.com) through Close's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search leads, contacts, opportunities, tasks, and inbox items; draft email and SMS; create and update CRM records; and work with workflows, Smart Views, and voice agents in the signed-in Close organization.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Close**.
3. Click **Install**, then complete the Close sign-in prompt. Pick the organization and the permission level to grant (read, safe write, or write including delete).

Or run `/add-plugin close` in chat.

In Grok Bot, open **Settings → Plugins**, install **Close**, and complete the same Close sign-in.

## MCP

```json
{
  "mcpServers": {
    "close": {
      "type": "http",
      "url": "https://mcp.close.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth 2.0 with PKCE (S256) and Dynamic Client Registration against `api.close.com`. Cursor registers itself and prompts for Close sign-in when the plugin connects, so there is no API key or client ID to configure. Each user signs in with their own Close account, picks one organization on the consent screen, and chooses `mcp.read`, `mcp.write_safe`, or `mcp.write_destructive`.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path. Close's registration endpoint accepts localhost and https Cursor callbacks and rejects custom-scheme URIs.

Close also accepts an API key via `Close-API-Key` and `Close-Scope` headers for clients that cannot do OAuth. Cursor supports OAuth, so you do not need an API key.

## Before you connect

You need a Close account with access to an organization. The permission level you grant on the consent screen sets which tools the agent can use:

- **Read** (`mcp.read`) — search and fetch data only
- **Safe write** (`mcp.write_safe`) — also create records, drafts, templates, and workflows
- **Destructive write** (`mcp.write_destructive`) — also update and delete records, merge leads, and schedule voice-agent calls

Each connection is scoped to one organization. Disconnect and reconnect to switch organizations. The server uses Streamable HTTP only; it does not support SSE.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Leads & contacts | Search, fetch, create, update, delete, and merge leads and contacts; add addresses; enrich fields |
| Opportunities | Search and fetch opportunities, pipelines, and statuses; create, update, and delete them |
| Inbox & tasks | List and fetch inbox items, tasks, and call tasks; create tasks; mark or snooze inbox items; bulk-update tasks |
| Conversations | Search activities; fetch emails, SMS, comments, notes, and meeting transcripts; create notes and comments; create and update draft email and SMS |
| Templates & views | List, render, create, update, and delete email and SMS templates; manage Smart Views and pinned views |
| Workflows | List, create, and update workflows |
| Voice agents | List agents and skills, read performance reports, propose and apply config updates, and schedule outbound calls |
| Custom data | List custom fields, custom object types, and custom activities; create, update, and delete instances |
| Org & billing | Read org info, members, roles, groups, phone numbers, billing summary, and AI credit usage |
| Product help | Search Close product documentation |

The hosted runtime is the source of truth for tool names and schemas. See [Close MCP Tools](https://developer.close.com/mcp/tools) for the current list per permission level.

## Notes

- Tool calls run as the Close user who authorizes the connection and cannot exceed that user's permissions or the granted scope.
- Updating an existing record is a destructive-write tool. Creating a new record is a safe-write tool.
- Deletes and lead merges cannot be undone. Confirm the record before letting the agent delete or merge.
- Draft email and SMS stay in Close until someone sends them. Scheduling a voice-agent call places a real outbound call.
- Revoke access by disconnecting the plugin in Cursor.

## Docs

- Close MCP server: https://developer.close.com/mcp
- Close MCP tools: https://developer.close.com/mcp/tools
- Help Center: https://help.close.com/integrations/close-mcp-server
- Server URL: https://mcp.close.com/mcp

Logo is Close's official orbit mark, the apple-touch-icon published on close.com.

## License

MIT

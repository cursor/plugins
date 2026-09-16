# Attio

Cursor plugin that connects agents to [Attio](https://attio.com) through Attio's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search, create, and update CRM records (people, companies, deals, and custom objects), work with lists, notes, and tasks, and search emails, meetings, and comments in the signed-in Attio workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Attio**.
3. Click **Install**, then complete the Attio sign-in prompt.

Or run `/add-plugin attio` in chat.

## MCP

```json
{
  "mcpServers": {
    "attio": {
      "type": "http",
      "url": "https://mcp.attio.com/mcp"
    }
  }
}
```

Auth is OAuth against Attio. Cursor prompts for Attio user login when the plugin connects — there is no API key or client ID to configure.

## Before you connect

You need an Attio account with access to a workspace. Attio MCP is available to all workspace members.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Records & objects | Search, create, update, upsert, and merge people, companies, deals, and custom objects |
| Lists | Inspect lists and attributes, add records, and update list entries and stages |
| Notes | Search, create, and update notes; semantic search over note content |
| Tasks | List, create, and update tasks |
| Meetings & calls | Search call recordings and transcripts |
| Emails | Search and read emails |
| Comments | List and add comments on records and list entries |
| Workspace | List members and teams; inspect the signed-in user |
| Reporting | Run basic reports; optional read-only SQL on some plans |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Attio user who authorizes the connection and cannot exceed that user's permissions.
- Read operations are auto-approved. Write operations request confirmation before they change workspace data.
- `query-particle-sql` (read-only SQL) is not available on every Attio billing plan.
- Attio hosts the server itself; this plugin does not wrap a local stdio server.
- Revoke access at any time from your Attio account settings.

## Docs

- Attio MCP overview: https://docs.attio.com/mcp/overview
- Attio MCP help center: https://attio.com/help/reference/attio-ai/attio-mcp
- Server URL: https://mcp.attio.com/mcp

Logo is Attio's official mark, from the `attio` GitHub organization.

## License

MIT

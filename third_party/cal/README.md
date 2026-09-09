# Cal.com

Cursor plugin that connects agents to [Cal.com](https://cal.com/docs/mcp-server) through Cal.com's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Manage bookings, event types, schedules, and availability.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Cal.com**.
3. Click **Install**, then complete the Cal.com sign-in prompt.

Or run `/add-plugin cal` in chat.

## MCP

```json
{
  "mcpServers": {
    "cal": {
      "type": "http",
      "url": "https://mcp.cal.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Cal.com sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Cal.com account. The hosted server wraps the Cal.com API v2 with 34 curated tools.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Bookings | List, create, reschedule, cancel, and confirm bookings; manage attendees |
| Event types | List, create, update, and delete event types |
| Schedules | Manage schedules and the default schedule |
| Availability | Available slots and busy times |
| Organizations | Memberships and routing forms |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Cal.com user who authorizes the connection.
- Cal.com also ships `@calcom/cal-mcp` for local stdio use with an API key; this plugin uses the hosted server only.

## Docs

- Cal.com MCP server: https://cal.com/docs/mcp-server
- Server URL: https://mcp.cal.com/mcp

Logo is Cal.com's official mark, from the `calcom` GitHub organization.

## License

MIT

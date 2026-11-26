# Cal.com

Cursor plugin that connects agents to [Cal.com](https://cal.com) through Cal.com's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Check availability, create and manage event types, book, reschedule, or cancel meetings, and manage schedules, teams, and organizations in the signed-in Cal.com account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Cal.com**.
3. Click **Install**, then complete the Cal.com sign-in prompt.

Or run `/add-plugin cal-com` in chat.

## MCP

```json
{
  "mcpServers": {
    "cal-com": {
      "type": "http",
      "url": "https://mcp.cal.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE and Dynamic Client Registration. Cursor registers itself and prompts for Cal.com sign-in when the plugin connects — there is no API key or client ID to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Profile | Read and update the signed-in user's profile |
| Event types | List, inspect, create, update, and delete event types; read settings, history, and scheduling config |
| Bookings | List and inspect bookings; create, reschedule, cancel, and confirm; manage attendees; mark no-shows |
| Schedules | List, create, update, and delete availability schedules |
| Availability & calendars | Available slots, busy times, connected calendars, and conferencing apps |
| Teams | List teams, invite members, and manage team memberships |
| Organizations | Manage org memberships and user attributes |
| Routing forms | List routing forms and responses, calculate routed slots |
| API catalog | Search, describe, and call any Cal.com API v2 operation |
| Docs & links | Search Cal.com docs and build deep links into the Cal.com web app |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Cal.com user who authorizes the connection.
- The server can write as well as read — including creating, rescheduling, and cancelling bookings and deleting event types.
- To register only a subset of tools, add a `toolsets` query parameter to the URL, for example `https://mcp.cal.com/mcp?toolsets=bookings,availability`. Valid values: `profile`, `event-types`, `bookings`, `availability`, `schedules`, `calendars`, `teams`, `organizations`, `routing-forms`, `catalog`.
- Cal.com also publishes a self-hosted stdio server (`npx @calcom/cal-mcp@latest` with a `CAL_API_KEY`) for self-hosted Cal.com instances; this plugin uses the hosted server.

## Docs

- Cal.com MCP server: https://cal.com/docs/mcp-server
- API v2 reference: https://cal.com/docs/api-reference/v2/introduction
- Source: https://github.com/calcom/companion
- Server URL: https://mcp.cal.com/mcp

Logo is Cal.com's official mark, from the `calcom` GitHub organization.

## License

MIT

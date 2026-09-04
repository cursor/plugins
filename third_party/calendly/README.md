# Calendly

Cursor plugin that connects agents to [Calendly](https://calendly.com) through Calendly's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Check and update availability, generate scheduling links, and book, cancel, or reschedule meetings in the signed-in Calendly account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Calendly**.
3. Click **Install**, then complete the Calendly sign-in prompt.

Or run `/add-plugin calendly` in chat.

## MCP

```json
{
  "mcpServers": {
    "calendly": {
      "type": "http",
      "url": "https://mcp.calendly.com/"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE and Dynamic Client Registration. Cursor registers itself and prompts for Calendly sign-in when the plugin connects — there is no client ID or personal access token to configure. Calendly does not accept personal access tokens on the MCP server.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Event types | List and inspect event types |
| Scheduled events | Look up scheduled events and invitees, and cancel or reschedule |
| Availability | Availability schedules and busy times |
| Scheduling links | Generate single-use and shared scheduling links |
| Routing & org | Routing forms and organization management |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Calendly user who authorizes the connection, with the `mcp:scheduling:read` and `mcp:scheduling:write` scopes.
- The server works on the free tier, though which actions are available varies by Calendly plan.
- Calendly hosts the server itself; self-hosting and local deployment are not supported.
- The endpoint is the bare origin with a trailing slash — `https://mcp.calendly.com/`, not `/mcp`.

## Docs

- Calendly MCP server: https://developer.calendly.com/calendly-mcp-server
- Supported tools: https://developer.calendly.com/supported-tools
- Connect Calendly to your AI tools: https://calendly.com/help/connect-calendly-to-your-ai-tools
- Server URL: https://mcp.calendly.com/

Logo is Calendly's official mark, from the `calendly` GitHub organization.

## License

MIT

# Kalender Sync

Cursor plugin that connects agents to [Kalender Sync](https://kalender-sync.de/en/mcp/) through Kalender Sync's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Kalender Sync connects Google Calendar, Outlook, iCloud, and supported CalDAV calendars to AI assistants. Check availability, find, create, update, and delete events, answer supported invitations, and manage one-way or two-way calendar syncs.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Kalender Sync**.
3. Click **Install**, then complete the Kalender Sync sign-in prompt.

Or run `/add-plugin ppj-venture-labs` in chat.

## MCP

```json
{
  "mcpServers": {
    "ppj-venture-labs": {
      "type": "http",
      "url": "https://app.kalender-sync.de/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Kalender Sync sign-in when the plugin connects — there is no API key to configure.

## Before you connect

You need a Kalender Sync account with at least one connected calendar.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Calendars | List connected calendars and check availability |
| Events | Find, create, update, and delete events; answer supported invitations |
| Syncs | Preview, create, list, diagnose, pause, resume, and delete one-way or two-way calendar syncs |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Users control calendar access, detail visibility, and write/sync permissions in Kalender Sync.
- CalDAV RSVP depends on provider support; iCloud cannot answer Google or Outlook invitations.
- Hosted in Germany.

## Docs

- Kalender Sync MCP: https://kalender-sync.de/en/mcp/
- Server URL: https://app.kalender-sync.de/mcp

Logo is the `kalender-sync` GitHub organization avatar (the organization lists https://kalender-sync.de/en/ as its website). kalender-sync.de was unreachable from the build environment when this plugin was added, so the submitted `https://kalender-sync.de/favicon.png` was not downloaded.

## License

MIT

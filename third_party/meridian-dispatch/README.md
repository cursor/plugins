# Meridian Dispatch

Cursor plugin that connects agents to [Meridian Dispatch](https://www.meridiandispatch.com) through Meridian Dispatch's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Plan your trip in conversation: ask for an itinerary, move a day, or add a dinner. Meridian Dispatch keeps the plan and sends it to its iPhone app. Behind it are guides to countries, towns, sights, hikes, ski resorts, and festivals — when to go, what is worth it, and what is nearby.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Meridian Dispatch**.
3. Click **Install**.

Or run `/add-plugin meridian-dispatch` in chat.

## MCP

```json
{
  "mcpServers": {
    "meridian-dispatch": {
      "type": "http",
      "url": "https://www.meridiandispatch.com/api/mcp"
    }
  }
}
```

The guide tools are open to everyone with no sign-in. Planning tools require signing in to Meridian Dispatch (Sign in with Apple); Cursor prompts for sign-in the first time a planning tool is used.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Guides | Search guides and read destination overviews (`search_guides`, `get_destination`) |
| Places | Look up sights and what is nearby (`get_place`, `list_nearby`) |
| Timing | Find the best time to visit (`get_best_time`) and festivals and events (`list_events`) |
| Planning | Create and edit trip plans synced to the Meridian Dispatch iPhone app (`create_plan`, `edit_plan`) |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Meridian Dispatch: https://www.meridiandispatch.com
- Server URL: https://www.meridiandispatch.com/api/mcp

Logo: the submitted app icon at https://www.meridiandispatch.com/images/app/app-icon.png could not be downloaded when this plugin was added (TLS connection failures from the build environment), so `plugin.json` references the remote URL instead of a local file.

## License

MIT

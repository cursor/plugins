# GramPrompt

Cursor plugin that connects agents to [GramPrompt](https://gramprompt.com) through GramPrompt's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Free, read-only gym discovery. Search gyms in a city or nearby, compare addresses, public ratings, and indicative day-pass prices, and check preliminary session information.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **GramPrompt**.
3. Click **Install**.

Or run `/add-plugin gramprompt` in chat.

## MCP

```json
{
  "mcpServers": {
    "gramprompt": {
      "type": "http",
      "url": "https://gramprompt.com/mcp"
    }
  }
}
```

The server is public and needs no authentication — there is no sign-in, client ID, or API key to configure.

## What agents can do

| Tool | Capabilities |
| --- | --- |
| `search_gyms` | Find gyms in a city or nearby (for example, "gyms in Bolton UK") |
| `get_gym_details` | Look up address, public ratings, and indicative day-pass prices for a gym by `placeId` |
| `check_availability` | Check preliminary session information for a gym on a date and time |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The plugin is read-only. It cannot reserve or cancel bookings, charge users, start checkout, or create paid media.
- Availability is indicative, not confirmed.

## Docs

- GramPrompt: https://gramprompt.com
- Server URL: https://gramprompt.com/mcp

The logo points at `https://gramprompt.com/apple-touch-icon.png`. gramprompt.com was unreachable when this plugin was added, so no logo file was committed.

## License

MIT

# Strava

Grok Bot plugin that connects agents to [Strava](https://www.strava.com) through Strava's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask about your runs, rides, and other activities, your weekly and yearly stats, and your athlete profile. Access is read-only.

## Install

In Grok Bot, open **Settings → Plugins**, install **Strava**, and complete the Strava sign-in.

## MCP

```json
{
  "mcpServers": {
    "strava": {
      "type": "http",
      "url": "https://mcp.strava.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth against `https://www.strava.com/mcp-issuer`. Strava only accepts MCP clients it has approved, so sign-in uses Grok's Strava app. Its client credentials are held by Grok's backend, which also runs the token exchange. There is no API key or client ID to configure, and each athlete signs in with their own Strava account.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## What you share

Signing in grants these Strava scopes:

| Scope | Grants |
| --- | --- |
| `read` | Public profile, segments, routes, and clubs |
| `activity:read_all` | All your activities, including ones visible only to you |
| `profile:read_all` | Your full profile, including heart rate and power zones |

Nothing is written back to Strava.

## Disconnect anytime

Disconnect the plugin in Grok Bot, or revoke **Grok** under **Settings → My Apps** on strava.com.

## Availability

- Grok Bot only. The plugin is hidden in Cursor.
- Strava has to approve Grok's app for MCP access before sign-in works.

## Docs

- Strava developers: https://developers.strava.com
- Server URL: https://mcp.strava.com/mcp

Logo is Strava's official app icon, from the 180×180 touch icon published on strava.com.

## License

MIT

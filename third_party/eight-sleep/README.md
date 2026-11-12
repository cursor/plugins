# Eight Sleep

Cursor plugin that connects agents to [Eight Sleep](https://www.eightsleep.com) through Eight Sleep's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read your sleep scores, stages and heart metrics, check your Pod's status and temperature settings, and manage your alarms and your side of the Pod. Every change is confirmed with you first.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Eight Sleep**.
3. Click **Install**, then complete the Eight Sleep sign-in prompt and allow the access you want to grant.

Or run `/add-plugin eight-sleep` in chat.

In Grok Bot, open **Settings → Plugins**, install **Eight Sleep**, and complete the same Eight Sleep sign-in.

## MCP

```json
{
  "mcpServers": {
    "eight-sleep": {
      "type": "http",
      "url": "https://public-api.8slp.net/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth. Eight Sleep uses the authorization code flow with PKCE (S256) and dynamic client registration against `https://auth-api.8slp.net`, so there is no API key or client ID to configure. Cursor or Grok Bot prompts for Eight Sleep sign-in when the plugin connects, and each user signs in with their own account.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## Before you connect

You need an Eight Sleep account and a Pod. Alarms and the temperature schedule also need an active Eight Sleep membership, and alarms need your timezone set in the app.

## Scopes

Access is split into three scopes, and the agent only gets the ones you grant:

| Scope | Grants |
| --- | --- |
| `read_sleep` | Sleep days and sleep sessions |
| `read_device` | Pod status, temperature settings, and alarms |
| `write_device` | "Control your device": change your alarms, power, temperature, and schedule |

A connection made before `write_device` existed can only read. To allow changes, disconnect Eight Sleep in your agent and connect it again, allowing "control your device" when asked.

## What agents can do

| Category | Tools |
| --- | --- |
| Sleep | `get_sleep_days`, `get_sleep_sessions`, `get_sleep_session` |
| Pod | `get_device_status`, `get_temperature_settings` |
| Alarms | `list_alarms`, `create_alarm`, `update_alarm`, `delete_alarm` |
| Changes | `set_pod_power`, `set_temperature`, `update_temperature_schedule` |

The hosted runtime is the source of truth for tool names and schemas. See the [Eight Sleep connector docs](https://public-api.8slp.net/connectors) for details.

## Notes

- Write tools only touch your own account and your own side of the bed, never your partner's. The server instructs the agent to confirm each change with you first, and each change reports what it did and how to undo it.
- Temperatures use the app's dial, from -10 (coolest) to +10 (warmest).
- Power, temperature, and schedule changes need an online Pod, meaning one that has reported in during the last 10 minutes. On a Pod 6 or later, the cover on your side must also be connected. Nothing changes while away mode is on. Alarm changes work offline and reach the Pod when it reconnects.
- The connector cannot stop or snooze a ringing alarm, toggle Autopilot or away mode, move the base, or cancel a therapy session.
- Everything returned is a measurement or setting from your account. No tool diagnoses, treats, or offers medical guidance.
- Rate limits: 60 calls per minute per connection, plus a cap of 10 change requests every 5 minutes and 50 per day.
- Revoke access from **Data Sharing** in the Eight Sleep app's settings, or by disconnecting the plugin. Revocation takes effect within five minutes.

## Docs

- Eight Sleep connector: https://public-api.8slp.net/connectors
- Server URL: https://public-api.8slp.net/mcp
- Support: support@eightsleep.com

Logo is Eight Sleep's official "8" mark, from the 180×180 web app icon published on eightsleep.com.

## License

MIT

# Skydropx

Cursor plugin that connects agents to [Skydropx](https://skydropx.com) through Skydropx's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Quote, buy, and track shipments across Mexico's main carriers from the chat, using your Skydropx account. Compare rates, print labels, schedule pickups, and manage store orders.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Skydropx**.
3. Click **Install**, then complete the Skydropx sign-in prompt.

Or run `/add-plugin skydropx` in chat.

## MCP

```json
{
  "mcpServers": {
    "skydropx": {
      "type": "http",
      "url": "https://mcp.skydropx.com"
    }
  }
}
```

Auth is OAuth with dynamic client registration, so Cursor prompts for Skydropx sign-in when the plugin connects. There is no client ID or API key to configure. Grant read and write permissions when prompted.

## Before you connect

You need a Skydropx account. Label purchases are charged to the account balance.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Rates | Quote and compare shipping rates across carriers |
| Labels | Buy and print shipping labels, and cancel labels where the carrier allows |
| Tracking | Track shipments |
| Pickups | Schedule carrier pickups |
| Stores | Manage store orders and saved addresses |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Skydropx account of the user who authorizes the connection.
- Buying a label spends account balance. Confirm before purchasing.

## Docs

- Skydropx: https://skydropx.com
- Server URL: https://mcp.skydropx.com

Logo is the avatar of the `Skydropx` GitHub organization. The submitted logo URL (ps.w.org) and skydropx.com could not be reached from the build sandbox.

## License

MIT

# viaSocket

Cursor plugin that connects agents to [viaSocket](https://viasocket.com/) through viaSocket's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

viaSocket MCP connects to 2,300+ apps through a single MCP endpoint. Agents can read app data, automate repetitive tasks, and build multi-step workflows across services like Slack, Gmail, Google Sheets, HubSpot, GitHub, and Notion without a custom integration for each app.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **viaSocket**.
3. Click **Install**, then complete the viaSocket sign-in prompt.

Or run `/add-plugin viasocket` in chat.

## MCP

```json
{
  "mcpServers": {
    "viasocket": {
      "type": "http",
      "url": "https://connect.viasocket.com/mcp"
    }
  }
}
```

## Before you connect

You need a viaSocket account. Connect each app you want agents to use in viaSocket and grant it the permissions it needs.

## What agents can do

| Category | Capabilities |
| --- | --- |
| App data | Read records and list resources from connected apps |
| Actions | Create records, send messages, and run other write actions in connected apps |
| Workflows | Build and run multi-step workflows across apps |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the app connections and permissions of the user who authorizes viaSocket.
- Try a read-only action before any write action, and connect the relevant app first.

## Docs

- viaSocket: https://viasocket.com/
- Server URL: https://connect.viasocket.com/mcp

Logo is the mark from the `viasocket` GitHub organization avatar (256×256). The submitted logo URL and viasocket.com could not be reached when this plugin was added, so the file was not downloaded from either.

## License

MIT

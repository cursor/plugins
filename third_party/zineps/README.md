# Zineps

Cursor plugin that connects agents to [Zineps](https://www.zineps.com) through Zineps' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find orders, check shipments and tracking, review invoices, and manage shipping tasks using your account permissions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Zineps**.
3. Click **Install**, then complete the Zineps sign-in prompt.

Or run `/add-plugin zineps` in chat.

## MCP

```json
{
  "mcpServers": {
    "zineps": {
      "type": "http",
      "url": "https://mcp.zineps.com/mcp"
    }
  }
}
```

The server uses Streamable HTTP with OAuth sign-in. Cursor prompts for Zineps sign-in when the plugin connects; there is no API key to configure. During sign-in you can choose a read-only scope.

## Before you connect

You need an existing Zineps account. See the [Zineps MCP login guide](https://mcp.zineps.com/docs/login).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Orders | Find orders and their details |
| Shipments | Check shipment status and tracking |
| Invoices | Review invoices |
| Shipping tasks | Manage shipping tasks and tickets |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Zineps permissions of the user who authorizes the connection.
- Write actions such as creating or cancelling labels act on your live Zineps account. Choose the read-only scope at sign-in if you only need lookups.

## Docs

- Zineps: https://www.zineps.com
- MCP login guide: https://mcp.zineps.com/docs/login
- Server URL: https://mcp.zineps.com/mcp

Logo is the Zineps icon from Zineps' [`Zineps/cursor-plugin`](https://github.com/Zineps/cursor-plugin) GitHub repository, resized to 512×512. The submitted logo URL (`https://mcp.zineps.com/docs/marketplace-icon.svg`) and zineps.com could not be reached when this plugin was added.

## License

MIT

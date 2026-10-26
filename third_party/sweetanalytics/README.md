# Sweet Analytics

Cursor plugin that connects agents to [Sweet Analytics](https://sweetanalytics.com) through Sweet Analytics' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query sales, product performance, and business analytics from your Sweet Analytics ecommerce account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Sweet Analytics**.
3. Click **Install**, then complete the Sweet Analytics sign-in prompt.

Or run `/add-plugin sweetanalytics` in chat.

## MCP

```json
{
  "mcpServers": {
    "sweetanalytics": {
      "type": "http",
      "url": "https://mcp.sweetanalytics.com/mcp"
    }
  }
}
```

Cursor prompts you to sign in to Sweet Analytics when the plugin connects.

## Before you connect

You need a Sweet Analytics account connected to your ecommerce store.

## Example prompts

- What were my sales last week?
- What were my top performing products yesterday?

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Sweet Analytics permissions of the user who authorizes the connection.

## Docs

- Sweet Analytics: https://sweetanalytics.com
- Server URL: https://mcp.sweetanalytics.com/mcp

Logo is the Sweet Analytics avatar from the `sweetanalytics` GitHub organization. sweetanalytics.com could not be reached when this plugin was added, so the submitted logo was not downloaded.

## License

MIT

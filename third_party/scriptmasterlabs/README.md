# B20 Truth

Cursor plugin that connects agents to B20 Truth by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Check Base-chain token claims against verified data.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **B20 Truth**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs-b20-truth` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://b20.scriptmasterlabs.com/mcp"
    }
  }
}
```

There is no API key or sign-in to configure. The publisher describes some read tools as free to call.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Token data | Look up verified data for tokens on Base |
| Fact checks | Check claims made about a Base token |

The hosted runtime is the source of truth for tool names, schemas, and pricing.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://b20.scriptmasterlabs.com/mcp

## License

MIT

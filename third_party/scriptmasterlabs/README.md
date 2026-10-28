# x402 Pay

Cursor plugin that connects agents to ScriptMasterLabs' x402 Pay through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Make and verify per-call USDC payments over x402 from agents.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **x402 Pay**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://squeezeos-api.onrender.com/mcp/x402-pay"
    }
  }
}
```

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://squeezeos-api.onrender.com/mcp/x402-pay

Logo is ScriptMasterLabs' `apple-touch-icon.png` from the scriptmasterlabs.com source repository. scriptmasterlabs.com could not be reached when this plugin was added, so the file was not downloaded from the website.

## License

MIT

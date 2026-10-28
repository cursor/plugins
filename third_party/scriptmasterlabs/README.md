# GatePay

Cursor plugin that connects agents to ScriptMasterLabs' GatePay through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Route policy-gated USDC payouts on Arc under hard caps, with free status, policy, and quote tools.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **GatePay**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://gatepay.onrender.com/mcp"
    }
  }
}
```

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://gatepay.onrender.com/mcp

Logo is ScriptMasterLabs' `apple-touch-icon.png` from the scriptmasterlabs.com source repository. scriptmasterlabs.com could not be reached when this plugin was added, so the file was not downloaded from the website.

## License

MIT

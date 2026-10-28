# ScriptMasterLabs

Cursor plugin that connects agents to [ScriptMasterLabs](https://scriptmasterlabs.com) through ScriptMasterLabs' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

x402 payment gateway MCP hosting ScriptMasterLabs' paid agent tools behind per-call USDC micropayments.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **ScriptMasterLabs**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://mcp-x402.onrender.com/mcp"
    }
  }
}
```

## Notes

- Paid tools are gated by the [x402](https://x402.org) protocol and settle per call in USDC. Free read tools are also available.
- The hosted runtime is the source of truth for tool names, schemas, and prices.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://mcp-x402.onrender.com/mcp

Logo is the ScriptMasterLabs `apple-touch-icon.png` (180×180) from the publisher's public site repository (`gitlab.com/timothy.walton45/sml-portfolio`). The submitted logo URL, `https://scriptmasterlabs.com/apple-touch-icon.png`, could not be fetched directly when this plugin was added.

## License

MIT

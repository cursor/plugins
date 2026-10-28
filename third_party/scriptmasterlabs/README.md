# SqueezeOS

Cursor plugin that connects agents to SqueezeOS by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Scan the market for stock squeezes, fails-to-deliver, and options flow.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SqueezeOS**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://squeezeos-api.onrender.com/mcp"
    }
  }
}
```

There is no API key or sign-in to configure. Some tools are free to call. The publisher describes other tools as paid per call over x402 (HTTP 402) and settled in stablecoins.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Squeezes | Scan for short-squeeze setups |
| Fails-to-deliver | Look up SEC fails-to-deliver data |
| Options flow | Review options-flow activity |
| Market scans | Run market-wide scans |

The hosted runtime is the source of truth for tool names, schemas, and pricing.

## Notes

- Market data is for research. It is not investment advice.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://squeezeos-api.onrender.com/mcp

## License

MIT

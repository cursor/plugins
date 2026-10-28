# Pro-Lo

Cursor plugin that connects agents to Pro-Lo by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Score multi-path coherence verdicts and analyze market microstructure and liquidity for tickers.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Pro-Lo**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://pro-lo.onrender.com/api/mcp/rpc"
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Coherence verdicts | Score multi-path coherence for a ticker |
| Liquidity | Analyze liquidity for a ticker |
| Microstructure | Review market microstructure signals |

The hosted runtime is the source of truth for tool names, schemas, and pricing.

## Notes

- Market data is for research. It is not investment advice.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://pro-lo.onrender.com/api/mcp/rpc

## License

MIT

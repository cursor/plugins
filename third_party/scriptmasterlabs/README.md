# Verdict

Cursor plugin that connects agents to Verdict by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Get independent jury verdicts on agent decisions, with signed, payable receipts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Verdict**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs-verdict` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://verdict.scriptmasterlabs.com/mcp"
    }
  }
}
```

There is no API key or sign-in to configure. The publisher describes some tools as free to call and verdict receipts as payable.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Verdicts | Ask an independent jury to rule on an agent decision |
| Receipts | Get a signed, payable receipt for each verdict |

The hosted runtime is the source of truth for tool names, schemas, and pricing.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://verdict.scriptmasterlabs.com/mcp

## License

MIT

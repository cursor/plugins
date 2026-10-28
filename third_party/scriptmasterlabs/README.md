# ScriptMasterLabs

Cursor plugin that connects agents to the ScriptMasterLabs Triple Trigger market-signal server, hosted by [ScriptMasterLabs](https://scriptmasterlabs.com) as a remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Scan tickers for setups where squeeze, options flow, and technical triggers line up.

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
      "url": "https://squeezeos-api.onrender.com/triple-trigger/mcp"
    }
  }
}
```

## What agents can do

- Scan tickers for aligned squeeze, flow, and technical triggers.
- Call the server's free read tools to fetch live signal data.

The hosted runtime is the source of truth for tool names, schemas, and which tools are free or paid.

## Notes

- Market signals are informational. They are not investment advice.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://squeezeos-api.onrender.com/triple-trigger/mcp

The logo is referenced by URL (`https://scriptmasterlabs.com/apple-touch-icon.png`) because scriptmasterlabs.com could not be reached when this plugin was added.

## License

MIT

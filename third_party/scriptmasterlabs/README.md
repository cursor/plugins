# ScriptMasterLabs

Cursor plugin that connects agents to the [ScriptMasterLabs](https://scriptmasterlabs.com) agent browser through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Pay-per-call web browsing and content extraction MCP for AI agents.

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
      "url": "https://agent-browser-r7d2.onrender.com/mcp"
    }
  }
}
```

## Notes

- Paid tools are billed per call by ScriptMasterLabs. Free read tools are available for checking the connection.
- The hosted runtime is the source of truth for tool names, schemas, and pricing.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://agent-browser-r7d2.onrender.com/mcp

## License

MIT

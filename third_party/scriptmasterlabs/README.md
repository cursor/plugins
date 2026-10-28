# Provider Trust

Cursor plugin that connects agents to ScriptMasterLabs' hosted Provider Trust [Model Context Protocol](https://modelcontextprotocol.io/) server.

Check whether an agent service provider is trustworthy before paying it.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Provider Trust**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs-provider-trust` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://provider-trust-mcp.onrender.com/mcp"
    }
  }
}
```

## What agents can do

- Verify an agent service provider's trustworthiness before sending it a payment.
- Call the server's free read tools to look up live provider data.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://provider-trust-mcp.onrender.com/mcp

## License

MIT

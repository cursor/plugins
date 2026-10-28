# Agent Verify

Cursor plugin that connects agents to Agent Verify by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Proof-check MCP: verifies agent identities and work claims before payment.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Agent Verify**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://scriptmasterlabs.com/agent-verify/mcp"
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Identity | Verify the identity of an agent before working with it |
| Work claims | Check an agent's claims about completed work before payment |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://scriptmasterlabs.com/agent-verify/mcp

## License

MIT

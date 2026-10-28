# GhostKey

Cursor plugin that connects agents to GhostKey by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Delegated session-key MCP: scoped, expiring keys so agents can act without holding master credentials.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **GhostKey**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://squeezeos-api.onrender.com/mcp/ghostkey"
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Session keys | Get scoped, expiring keys delegated for a task |
| Credentials | Act on a user's behalf without holding master credentials |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://squeezeos-api.onrender.com/mcp/ghostkey

Logo is ScriptMasterLabs' `apple-touch-icon.png` "S" mark, taken from the publisher's public site repository on GitLab because scriptmasterlabs.com could not be reached when this plugin was added.

## License

MIT

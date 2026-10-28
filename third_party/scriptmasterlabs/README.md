# Cascade Graph

Cursor plugin that connects agents to Cascade Graph by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Cascade Graph MCP: jury-scored cascade signal analysis for market events.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Cascade Graph**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://sml-portfolio.onrender.com/mcp"
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Market events | Analyze how a market event cascades into related signals |
| Scoring | Get jury-scored ratings for cascade signals |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://sml-portfolio.onrender.com/mcp

Logo is ScriptMasterLabs' `apple-touch-icon.png` "S" mark, taken from the publisher's public site repository on GitLab because scriptmasterlabs.com could not be reached when this plugin was added.

## License

MIT

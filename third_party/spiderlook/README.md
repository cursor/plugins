# Spiderlook

Cursor plugin that connects agents to [Spiderlook](https://spiderlook.com) through Spiderlook's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Research rivals using your Spiderlook projects, stored posts, ads, website evidence, metrics, signals, and sales battlecards.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Spiderlook**.
3. Click **Install**, then complete the Spiderlook sign-in prompt.

Or run `/add-plugin spiderlook` in chat.

## MCP

```json
{
  "mcpServers": {
    "spiderlook": {
      "type": "http",
      "url": "https://api.spiderlook.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Spiderlook sign-in when the plugin connects.

## Before you connect

You need a Spiderlook account with at least one project.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Projects | Read your Spiderlook projects, tracked brands, and rivals |
| Evidence | Look up stored posts, ads, and website evidence for rivals |
| Metrics and signals | Review tracked metrics and competitive signals |
| Battlecards | Pull sales battlecards for rivals |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Spiderlook account of the user who authorizes the connection.

## Docs

- Spiderlook: https://spiderlook.com
- Server URL: https://api.spiderlook.com/mcp

The logo points to Spiderlook's hosted icon (`https://app.spiderlook.com/favicon.png`). Spiderlook's hosts could not be reached when this plugin was added, so no local copy is committed.

## License

MIT

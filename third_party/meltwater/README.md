# Meltwater

Cursor plugin that connects agents to [Meltwater](https://developer.meltwater.com/guides/meltwater-mcp/overview) through Meltwater's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search media and social mentions and pull analytics.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Meltwater**.
3. Click **Install**, then enter your Meltwater API token.

Or run `/add-plugin meltwater` in chat.

## MCP

```json
{
  "mcpServers": {
    "meltwater": {
      "type": "http",
      "url": "https://api.meltwater.com/v2/mcp",
      "headers": {
        "apikey": "${MELTWATER_API_KEY}"
      }
    }
  }
}
```

Auth is an API key sent as the `apikey` header. Cursor asks for `MELTWATER_API_KEY` when you install the plugin and never stores it in the repository.

## Before you connect

You need a Meltwater subscription that includes the Meltwater MCP package and an API token from the developer portal. Available tools depend on the products in your subscription.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Your assets | Find saved searches and tags configured in Meltwater |
| Mentions | Retrieve news and social documents for a saved search |
| Analytics | Volume, sentiment, top sources, and themes |
| Queries | Generate a query when no saved search exists |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Meltwater authenticates custom clients with the `apikey` header; OAuth is planned but not available yet.
- This is Meltwater MCP (`/v2/mcp`), not the higher-level Mira API endpoint at `/mcp`.

## Docs

- Meltwater MCP overview: https://developer.meltwater.com/guides/meltwater-mcp/overview
- Connecting: https://developer.meltwater.com/guides/meltwater-mcp/connecting
- Server URL: https://api.meltwater.com/v2/mcp

Logo is Meltwater's official mark.

## License

MIT

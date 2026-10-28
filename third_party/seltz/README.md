# Seltz

Cursor plugin that connects agents to [Seltz](https://seltz.ai/) through Seltz's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Seltz gives your agent fast, accurate web search, powered by a proprietary crawler and index. Use search to find current information on any topic, with filters for news, companies and people, and fetch to read the full content of any page. Every result comes with its source URL, so your agent can cite what it finds.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Seltz**.
3. Click **Install**, then provide your Seltz API key when prompted.

Or run `/add-plugin seltz` in chat.

## MCP

```json
{
  "mcpServers": {
    "seltz": {
      "type": "http",
      "url": "https://mcp.seltz.ai/mcp"
    }
  }
}
```

Seltz authenticates with an API key sent as `Authorization: Bearer <your-seltz-api-key>`. See the [Seltz MCP docs](https://docs.seltz.ai/integrations/mcp) for how to get a key.

## What agents can do

| Tool | Capabilities |
| --- | --- |
| Search | Find current information on any topic, with filters for news, companies, and people |
| Fetch | Read the full content of a page |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Seltz: https://seltz.ai/
- MCP docs: https://docs.seltz.ai/integrations/mcp
- Server URL: https://mcp.seltz.ai/mcp

Logo is the avatar of the `seltz-ai` GitHub organization (which links to seltz.ai), as submitted by the publisher.

## License

MIT

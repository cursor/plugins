# Onhand

Cursor plugin that connects agents to [Onhand](https://www.askonhand.com) through Onhand's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Onhand is a data layer for local businesses. Agents can ask what a shop has in stock, when it has an open appointment, what services it offers, and how to reach it. Stock and open times come from the shop's own connected register or booking system. When a shop hasn't shared something, Onhand says so instead of guessing.

Coverage currently starts with local businesses in Dallas, TX.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Onhand**.
3. Click **Install**. Search works without signing in; signed-in tools prompt for Onhand sign-in.

Or run `/add-plugin onhand` in chat.

## MCP

```json
{
  "mcpServers": {
    "onhand": {
      "type": "http",
      "url": "https://mcp.askonhand.com/mcp/grok"
    }
  }
}
```

Search tools need no sign-in. Signed-in tools use OAuth, so Cursor prompts for Onhand sign-in when needed — there is no API key to configure.

## What agents can do

| Tool | Capability |
| --- | --- |
| `discover_local` | Find nearby businesses by location, query, and category |
| `get_business` | Get a business's full listing, including hours, contact details, and sources |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Onhand: https://www.askonhand.com
- Server URL: https://mcp.askonhand.com/mcp/grok
- Support: help@askonhand.com

## License

MIT

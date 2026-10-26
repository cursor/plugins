# Soundlink

Cursor plugin that connects agents to [Soundlink](https://getsoundlink.com/) through Soundlink's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Pull music marketing insights like acquisition costs and retention into AI-powered workflows.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Soundlink**.
3. Click **Install**, then complete the Soundlink sign-in prompt if one appears.

Or run `/add-plugin soundlink` in chat.

## MCP

```json
{
  "mcpServers": {
    "soundlink": {
      "type": "http",
      "url": "https://api.getsoundlink.com/mcp"
    }
  }
}
```

## Before you connect

You need a Soundlink account. See Soundlink's [MCP server docs](https://www.getsoundlink.com/docs/mcp-server) for setup details.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Acquisition | Pull acquisition-cost insights for music advertising campaigns |
| Retention | Pull listener retention insights |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Soundlink: https://getsoundlink.com/
- MCP server docs: https://www.getsoundlink.com/docs/mcp-server
- Server URL: https://api.getsoundlink.com/mcp

## License

MIT

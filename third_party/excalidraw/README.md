# Excalidraw

Cursor plugin that connects agents to [Excalidraw](https://github.com/excalidraw/excalidraw-mcp) through Excalidraw's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Draw and export hand-drawn diagrams from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Excalidraw**.
3. Click **Install**.

Or run `/add-plugin excalidraw` in chat.

## MCP

```json
{
  "mcpServers": {
    "excalidraw": {
      "type": "http",
      "url": "https://mcp.excalidraw.com/mcp"
    }
  }
}
```

No authentication is required; the server covers public repositories only.

## Before you connect

No account is needed. The hosted server renders diagrams as interactive MCP App views in clients that support them, and can export `.excalidraw` files anywhere.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Draw | Create a diagram view from elements the agent describes |
| Export | Export the current drawing to an `.excalidraw` file |
| Checkpoints | Save and restore drawing checkpoints within a session |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- This is the open-source Excalidraw MCP server. Excalidraw+ workspaces use a separate authenticated endpoint (`https://api.excalidraw.com/api/v1/mcp`) that this plugin does not configure.
- The bare origin `https://mcp.excalidraw.com` redirects to `/mcp`; the plugin uses the final URL.

## Docs

- excalidraw-mcp on GitHub: https://github.com/excalidraw/excalidraw-mcp
- Server URL: https://mcp.excalidraw.com/mcp

Logo is Excalidraw's official mark, from the `excalidraw` GitHub organization.

## License

MIT

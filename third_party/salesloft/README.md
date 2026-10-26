# Salesloft

Cursor plugin that connects agents to [Salesloft](https://www.salesloft.com) through Salesloft's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask about accounts, people, opportunities, and recorded conversations in your Salesloft team. The server only reads data.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Salesloft**.
3. Click **Install**, then complete the Salesloft sign-in prompt.

Or run `/add-plugin salesloft` in chat.

## MCP

```json
{
  "mcpServers": {
    "salesloft": {
      "type": "http",
      "url": "https://mcp.salesloft.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is MCP OAuth (Bearer). Cursor discovers the authorization server when the plugin connects and prompts for Salesloft login. There is no API token, client secret, or custom header to configure.

## Before you connect

- The Salesloft MCP server is available to Salesloft customers with an Agentic package.
- A Salesloft admin must turn it on first: **Settings → Artificial Intelligence → Salesloft MCP → Enable MCP Server**.

## Notes

- Tool calls run as the Salesloft user who authorizes the connection and cannot exceed that user's permissions.
- MCP calls count against your team's Salesloft API limits.
- OAuth metadata is discovered at connect time (protected resource `https://mcp.salesloft.com/.well-known/oauth-protected-resource/mcp`, authorization server `https://accounts.salesloft.com/mcp`, scopes `accounts:read`, `conversations:read`, `opportunities:read`, `people:read`, `team:read`, `ai_feedback:write`).
- The hosted runtime is the source of truth for tool names and schemas; tools are listed after sign-in.

## Docs

- Salesloft MCP Server: https://help.salesloft.com/s/article/Salesloft-MCP-Server?language=en_US
- Server URL: https://mcp.salesloft.com/mcp

Logo is Salesloft's official app icon, from the Salesloft Mobile App Store listing (Salesloft LLC).

## License

MIT

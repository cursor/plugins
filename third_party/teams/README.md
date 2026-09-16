# Teams

Cursor plugin that connects agents to [Microsoft Teams](https://www.microsoft.com/microsoft-teams) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search chats and channel messages, read conversations, send messages, and react in the signed-in Microsoft account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Teams**.
3. Click **Install**, then complete the Microsoft sign-in prompt.

Or run `/add-plugin teams` in chat.

## MCP

```json
{
  "mcpServers": {
    "teams": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/teams/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Microsoft (Entra ID). Cursor prompts for Microsoft sign-in when the plugin connects. A work or school account is required. Reading channel messages needs tenant admin consent before the plugin can connect.

## Docs

- Teams API (Microsoft Graph): https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview
- Microsoft Graph overview: https://learn.microsoft.com/en-us/graph/overview

Logo is the official Microsoft Teams product icon from Microsoft's Fluent brand icon CDN, placed on a white tile with padding so it reads well in the Cursor UI:
https://res-1.cdn.office.net/files/fabric-cdn-prod_20240411.001/assets/brand-icons/product/svg/teams_48x1.svg

## License

MIT

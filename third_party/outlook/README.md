# Outlook

Cursor plugin that connects agents to [Microsoft Outlook](https://outlook.com) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search mail folders, read messages, send email, and look up contacts in the signed-in Microsoft account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Outlook**.
3. Click **Install**, then complete the Microsoft sign-in prompt.

Or run `/add-plugin outlook` in chat.

## MCP

```json
{
  "mcpServers": {
    "outlook": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/outlook/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Microsoft (Entra ID). Cursor prompts for Microsoft sign-in when the plugin connects.

## Docs

- Outlook mail API (Microsoft Graph): https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview
- Microsoft Graph overview: https://learn.microsoft.com/en-us/graph/overview

Logo is the official Microsoft Outlook product icon from Microsoft's Fluent brand icon CDN, placed on a white tile with padding so it reads well in the Cursor UI:
https://res-1.cdn.office.net/files/fabric-cdn-prod_20240411.001/assets/brand-icons/product/svg/outlook_48x1.svg

## License

MIT

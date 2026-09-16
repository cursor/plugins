# OneDrive

Cursor plugin that connects agents to [Microsoft OneDrive](https://onedrive.com) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Browse folders, search for files, and read file metadata and contents in the signed-in Microsoft account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **OneDrive**.
3. Click **Install**, then complete the Microsoft sign-in prompt.

Or run `/add-plugin onedrive` in chat.

## MCP

```json
{
  "mcpServers": {
    "onedrive": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/onedrive/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Microsoft (Entra ID). Cursor prompts for Microsoft sign-in when the plugin connects.

## Docs

- OneDrive API (Microsoft Graph): https://learn.microsoft.com/en-us/graph/api/resources/onedrive
- Microsoft Graph overview: https://learn.microsoft.com/en-us/graph/overview

Logo is the official Microsoft OneDrive product icon from Microsoft's Fluent brand icon CDN, placed on a white tile with padding so it reads well in the Cursor UI:
https://res-1.cdn.office.net/files/fabric-cdn-prod_20240411.001/assets/brand-icons/product/svg/onedrive_48x1.svg

## License

MIT

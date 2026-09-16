# SharePoint

Cursor plugin that connects agents to [Microsoft SharePoint](https://www.microsoft.com/microsoft-365/sharepoint/collaboration) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search for sites, browse a site's document libraries and folders, search and read files, and read SharePoint lists and list items in the signed-in Microsoft account.

## SharePoint vs. OneDrive

The [OneDrive plugin](../onedrive/) reaches the signed-in user's **personal drive**. This plugin reaches the **sites** the user can access: team and communication sites, their document libraries, and their lists. Install both if you want personal files and team sites covered.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SharePoint**.
3. Click **Install**, then complete the Microsoft sign-in prompt.

Or run `/add-plugin sharepoint` in chat.

## MCP

```json
{
  "mcpServers": {
    "sharepoint": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/sharepoint/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Microsoft (Entra ID). Cursor prompts for Microsoft sign-in when the plugin connects.

The plugin is read-only. It requests the delegated `Sites.Read.All` scope, which Microsoft classifies as high-impact, so most work or school tenants require an administrator to consent once before members can connect.

## Tools

| Area | Tools |
|:-----|:------|
| Sites | `search_sites`, `get_site` |
| Document libraries | `list_site_drives`, `list_site_drive_items`, `search_site_drive_items`, `get_site_drive_item` |
| Lists | `list_site_lists`, `get_list`, `list_list_items`, `get_list_item` |

## Docs

- SharePoint sites API (Microsoft Graph): https://learn.microsoft.com/en-us/graph/api/resources/sharepoint
- Microsoft Graph overview: https://learn.microsoft.com/en-us/graph/overview

Logo is the official Microsoft SharePoint product icon from Microsoft's Fluent brand icon CDN, placed on a white tile with padding so it reads well in the Cursor UI:
https://res-1.cdn.office.net/files/fabric-cdn-prod_20240411.001/assets/brand-icons/product/svg/sharepoint_48x1.svg

## License

MIT

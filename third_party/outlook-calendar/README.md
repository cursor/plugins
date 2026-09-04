# Outlook Calendar

Cursor plugin that connects agents to [Outlook Calendar](https://outlook.com/calendar) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

List upcoming events, check schedules, and create, update, or cancel meetings in the signed-in Microsoft account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Outlook Calendar**.
3. Click **Install**, then complete the Microsoft sign-in prompt.

Or run `/add-plugin outlook-calendar` in chat.

## MCP

```json
{
  "mcpServers": {
    "outlook-calendar": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/outlook-calendar/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Microsoft (Entra ID). Cursor prompts for Microsoft sign-in when the plugin connects.

## Docs

- Outlook calendar API (Microsoft Graph): https://learn.microsoft.com/en-us/graph/api/resources/calendar
- Microsoft Graph overview: https://learn.microsoft.com/en-us/graph/overview

Logo is Microsoft's official Outlook Calendar product icon (`OutlookCalendar_24x`), placed on a white tile with padding so it reads well in the Cursor UI. Microsoft's Fluent brand icon CDN (`res-1.cdn.office.net/files/fabric-cdn-prod_*/assets/brand-icons/product/svg/`) does not ship a standalone calendar icon, so this uses the Outlook Calendar icon from Microsoft's product icon set.

## License

MIT

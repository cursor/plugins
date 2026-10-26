# Power BI

Cursor plugin that connects Grok Bot to [Microsoft Power BI](https://powerbi.microsoft.com) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

List workspaces, reports, and datasets, and render report pages as images. Every tool only reads.

## Install

1. Open **Grok Bot Settings → Plugins**.
2. Search for **Power BI**.
3. Click **Install**, then complete the Microsoft sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "power-bi": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/power-bi/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Microsoft (Entra ID) with the read-only Power BI scopes `Workspace.Read.All`, `Report.Read.All`, and `Dataset.Read.All`, plus `offline_access`. Grok Bot prompts for Microsoft sign-in when the plugin connects. Power BI works only with work or school accounts.

## Tools

- **Browse:** `list_workspaces`, `list_reports`, `list_datasets`
- **Render:** `render_report` returns report pages as PNG images. The workspace must be on Premium, Embedded, or Fabric capacity, and the tenant setting "Export reports as image files" must be on.

## Docs

- Power BI REST API: https://learn.microsoft.com/en-us/rest/api/power-bi/
- Export a report to file: https://learn.microsoft.com/en-us/power-bi/developer/embedded/export-to

Logo is the official Microsoft Power BI icon from Microsoft's Power BI icon set, placed on a white tile with padding so it reads well in the UI:
https://github.com/microsoft/PowerBI-Icons/blob/main/SVG/Power-BI.svg

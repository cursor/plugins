# Google Sheets

Cursor plugin that connects agents to [Google Sheets](https://sheets.google.com) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read spreadsheet metadata and cell ranges, create spreadsheets, write and append values, clear ranges, and manage sheet tabs.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Sheets**.
3. Click **Install**, then complete the Google sign-in prompt.

Or run `/add-plugin google-sheets` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-sheets": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/google-sheets/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Google. Cursor prompts for Google sign-in when the plugin connects.

## Skill

The bundled `google-sheets` skill teaches agents spreadsheet conventions: when to use A1 versus grid coordinates, dashboard formatting, charts, and validation.

## Docs

- Google Sheets API: https://developers.google.com/workspace/sheets/api/reference/rest
- Google Workspace overview: https://developers.google.com/workspace

Logo is the official Google Sheets product icon, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT

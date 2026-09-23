# Google Docs

Cursor plugin that connects agents to [Google Docs](https://docs.google.com) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read document structure and text, create documents, insert and replace text, delete content ranges, and apply paragraph styles.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Docs**.
3. Click **Install**, then complete the Google sign-in prompt.

Or run `/add-plugin google-docs` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-docs": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/google-docs/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Google. Cursor prompts for Google sign-in when the plugin connects.

## Skill

The bundled `google-docs` skill teaches agents document-authoring conventions: the index contract for safe edits, character and paragraph styling, lists, tables, and images.

## Docs

- Google Docs API: https://developers.google.com/workspace/docs/api/reference/rest
- Google Workspace overview: https://developers.google.com/workspace

Logo is the official Google Docs product icon, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT

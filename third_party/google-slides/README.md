# Google Slides

Cursor plugin that connects agents to [Google Slides](https://slides.google.com) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read presentation structure and text, create presentations, add and reorder slides, insert text boxes, shapes, images, and tables, style text and backgrounds, and render any slide as a PNG thumbnail.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Slides**.
3. Click **Install**, then complete the Google sign-in prompt.

Or run `/add-plugin google-slides` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-slides": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/google-slides/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Google. Cursor prompts for Google sign-in when the plugin connects.

## Skill

The bundled `google-slides` skill teaches agents deck-building conventions: object handles and point geometry, layout that avoids clipped images, palette and text styling, and per-slide PNG verification.

## Docs

- Google Slides API: https://developers.google.com/workspace/slides/api/reference/rest
- Google Workspace overview: https://developers.google.com/workspace

Logo is the official Google Slides product icon, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT

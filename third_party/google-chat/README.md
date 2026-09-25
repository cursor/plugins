# Google Chat

Cursor plugin that connects agents to [Google Chat](https://chat.google.com) through Google's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Access spaces, read conversations, and send messages from the signed-in Google Workspace account.

> [!NOTE]
> The Google Chat MCP server is currently a Google Workspace Developer Preview. Availability, APIs, and behavior may change.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Chat**.
3. Click **Install**, then complete the Google sign-in prompt.

Or run `/add-plugin google-chat` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-chat": {
      "type": "http",
      "url": "https://chatmcp.googleapis.com/mcp/v1"
    }
  }
}
```

Auth is OAuth 2.0 against Google. Cursor prompts for Google sign-in when the plugin connects.

## Docs

- Google Chat MCP setup: https://developers.google.com/workspace/chat/api/guides/configure-mcp-server
- Workspace MCP overview: https://developers.google.com/workspace/guides/configure-mcp-servers

Logo is the official Google Chat product icon, placed on a white tile so it reads well in the Cursor UI:
https://fonts.gstatic.com/s/i/productlogos/chat_2020q4/v8/192px.svg

## License

MIT

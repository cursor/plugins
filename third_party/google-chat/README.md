# Google Chat

Cursor plugin that connects agents to [Google Chat](https://chat.google.com) through Google's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search spaces and direct messages, list members, read threads and read state, and send messages as the signed-in user.

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

### Auth status

This plugin is packaging only. Google's Chat MCP server uses the same Google Workspace OAuth model as the Gmail, Google Drive, and Google Calendar plugins, so it should slot into the same Google Workspace OAuth client path once the Chat scopes are added to that client's consent screen and to the host's allowlist. Until then, sign-in may fail or the server may reject calls with a permissions error.

Scopes the Chat MCP server requests (per Google's docs):

- `https://www.googleapis.com/auth/chat.spaces.readonly`
- `https://www.googleapis.com/auth/chat.memberships.readonly`
- `https://www.googleapis.com/auth/chat.messages.readonly`
- `https://www.googleapis.com/auth/chat.messages.create`
- `https://www.googleapis.com/auth/chat.users.readstate.readonly`

Google also requires `chatmcp.googleapis.com` to be enabled on the OAuth client's Cloud project. Read-only use works with just the API and OAuth client; sending messages additionally requires a Chat app configured in the project's Google Chat API settings (interactive features off).

## Docs

- Google MCP setup: https://developers.google.com/workspace/chat/api/guides/configure-mcp-server
- Workspace MCP overview: https://developers.google.com/workspace/guides/configure-mcp-servers

Logo is the official Google Chat product icon, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT

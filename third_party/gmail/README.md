# Gmail

Cursor plugin that connects agents to [Gmail](https://mail.google.com) through Google's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search threads, read messages, manage labels and drafts, and compose mail in the signed-in Gmail account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Gmail**.
3. Click **Install**, then complete the Google sign-in prompt.

Or run `/add-plugin gmail` in chat.

## MCP

```json
{
  "mcpServers": {
    "gmail": {
      "type": "http",
      "url": "https://gmailmcp.googleapis.com/mcp/v1"
    }
  }
}
```

Auth is OAuth 2.0 against Google. Cursor prompts for Google sign-in when the plugin connects.

This plugin does **not** declare OAuth scopes or a Google client ID. Unlike the X plugin, Google Workspace connectors use Cursor's first-party Google OAuth client against the hosted MCP. Scopes are not configured in this repository.

### Filter tools

`create_filter`, `list_filters`, `update_filter`, and `delete_filter` require:

`https://www.googleapis.com/auth/gmail.settings.basic`

That is a different grant from `gmail.modify` (labels/messages) and from “See (but not change) your email settings” (`gmail.readonly`). Google's hosted MCP already advertises `gmail.settings.basic` in its protected-resource metadata, but the connector OAuth client must request it or filter tools return **403 after trying upscoping**.

After that scope is added to Cursor's Google OAuth client / consent screen, **existing users must disconnect Gmail and sign in again** so Google can re-prompt. Re-auth without a new scope does nothing.

Until then, create filters in Gmail Settings → Filters and Blocked Addresses.

## Docs

- Google MCP setup: https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server
- Workspace MCP overview: https://developers.google.com/workspace/guides/configure-mcp-servers

Logo is the official Gmail product icon, placed on a white tile with padding so it reads well in the Cursor UI:
https://www.gstatic.com/images/branding/productlogos/gmail_2026/v1/192px.svg

## License

MIT

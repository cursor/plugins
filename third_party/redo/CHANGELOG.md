# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `redo` MCP server pointing at Redo's hosted Streamable HTTP endpoint (`https://mcp.getredo.com/mcp`).
- Auth uses OAuth 2.0 Authorization Code with PKCE (S256) and Dynamic Client Registration against `mcp.getredo.com`; sign-in happens in the Redo merchant app at `app.getredo.com`. Redo allowlists redirect URIs at registration, and both of Cursor's current callbacks are accepted.
- Logo: Redo's official mark, the `apple-touch-icon.png` published on redo.com (256×256).

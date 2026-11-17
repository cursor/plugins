# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `close` MCP server pointing at Close's hosted Streamable HTTP endpoint (`https://mcp.close.com/mcp`).
- Auth uses OAuth 2.0 with Close user login (authorization code + PKCE, dynamic client registration via `api.close.com`) — no API key or client ID to configure. Registration accepts localhost and https Cursor callbacks, and rejects custom-scheme URIs (`cursor://`, `grokbot://`), so the server declares `"placement": "server"`.
- Logo: Close's official orbit mark, the apple-touch-icon published on close.com, at 192×192.

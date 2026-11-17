# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `item` MCP server pointing at Item's hosted Streamable HTTP endpoint (`https://mcp.item.app/mcp`).
- Auth uses OAuth 2.0 with Item sign-in (authorization code + PKCE, dynamic client registration, scopes `openid profile email`) — no API key or client ID to configure.
- Logo: Item's official app icon, the 256×256 icon published on item.app.

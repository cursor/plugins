# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `hospitable` MCP server pointing at Hospitable's hosted Streamable HTTP endpoint (`https://mcp.hospitable.com/mcp`).
- Auth uses OAuth 2.0 with Hospitable user login (authorization code + PKCE, dynamic client registration, scope `mcp:use`) — no API key or client ID to configure.
- Logo: Hospitable's official app icon, the apple-touch-icon published on hospitable.com, resized to 256×256.

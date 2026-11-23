# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1

- Docs: caption template count is now "200+", and the README no longer lists the removed layer-shortcut tools.

## 1.0.0 — initial release

- Added the `levea` MCP server pointing at Levea's hosted Streamable HTTP endpoint (`https://api.livecore.ai/api/v1/misc/mcp`).
- Auth uses OAuth 2.1 with Dynamic Client Registration (RFC 7591) and PKCE (`S256`) against `api.livecore.ai`, with the `levea` scope — no API key or client ID to configure. Sets `"placement": "server"` so Grok Bot dials the server through the hosted MCP path.
- Logo: Levea's official app icon at 256×256.

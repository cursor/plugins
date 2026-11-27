# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `folk` MCP server pointing at folk's hosted Streamable HTTP endpoint (`https://mcp.folk.app/mcp`), with `"placement": "server"` so Grok Bot dials it through the hosted MCP path.
- Auth uses OAuth 2.0 with folk user login (authorization code + PKCE, dynamic client registration via folk's Stytch authorization server at `api.stytch.folk.app`, sign-in at `app.folk.app`) — no API key or client ID to configure. Registration was verified to accept every Cursor redirect set, including Grok Bot mobile.
- Logo: folk's official smiley mark, the 512×512 icon published on folk.app, resized to 256×256.

# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `hq` MCP server pointing at Indigo's hosted Streamable HTTP endpoint for HQ (`https://hq-mcp.getindigo.ai/mcp`).
- Auth uses OAuth 2.0 with HQ sign-in (authorization code + PKCE, dynamic client registration, scopes `openid email profile hq-mcp/use`) — no API key or client ID to configure.
- Logo: the HQ mark, the 512×512 app icon published on hqforwork.com, resized to 256×256.

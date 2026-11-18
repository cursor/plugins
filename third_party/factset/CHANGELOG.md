# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `factset` MCP server pointing at FactSet's hosted Streamable HTTP endpoint (`https://mcp.factset.com/content/v1`).
- Auth uses OAuth 2.0 with FactSet user login (authorization code + PKCE, dynamic client registration via `auth.factset.com`, scopes `openid`, `mcp`, and `email`) — no API key or client ID to configure. Registration was verified to accept every Cursor redirect set, including Grok Bot mobile.
- Logo: FactSet's official "F" mark, the App Store icon published for the FactSet iOS app, resized to 192×192.

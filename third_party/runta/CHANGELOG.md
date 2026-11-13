# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `runta` MCP server pointing at Runta's hosted Streamable HTTP endpoint (`https://mcp.runta.com/mcp`).
- Auth uses OAuth with Runta sign-in (`api.runta.com`, scopes `runtime:read` and `runtime:manage`). Runta identifies clients with Client ID Metadata Documents instead of dynamic client registration, so there is no client ID or API key to configure.
- Logo: Runta's fox mark, the 256×256 favicon published on runta.com.

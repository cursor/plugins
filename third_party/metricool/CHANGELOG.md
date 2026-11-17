# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `metricool` MCP server pointing at Metricool's hosted Streamable HTTP endpoint (`https://ai.metricool.com/mcp`).
- Auth uses OAuth with Metricool user login (authorization code + PKCE, dynamic client registration, scopes `mcp:read` and `mcp:write`) — no API key or client ID to configure.
- Logo: Metricool's official mark, the 180×180 web app icon published on metricool.com.

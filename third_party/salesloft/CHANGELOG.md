# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `salesloft` MCP server pointing at Salesloft's hosted Streamable HTTP endpoint (`https://mcp.salesloft.com/mcp`), with `"placement": "server"` so Grok Bot connects through Cursor's hosted path.
- Auth uses MCP OAuth with Salesloft account login and PKCE — no API token, client secret, or custom header to configure.
- Logo: Salesloft's official app icon, from the Salesloft Mobile App Store listing (Salesloft LLC).

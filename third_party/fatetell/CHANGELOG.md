# Changelog

All notable changes to this plugin will be documented here.

## 0.1.0 — initial release

- Added the `fatetell` MCP server pointing at FateTell's hosted Streamable HTTP endpoint for clients that sign in while connecting (`https://mcp.fatetell.com/login/mcp`).
- Auth uses OAuth 2.1 with PKCE and FateTell sign-in; clients register through Client ID Metadata Documents or Dynamic Client Registration, so there is no client ID, key or token to configure.
- Added the `fatetell-bazi` skill on reading FateTell results, with its static chart-card template for hosts that do not render MCP Apps.
- Logo: the FateTell mark on a paper-colored plate.

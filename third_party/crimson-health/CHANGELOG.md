# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `crimson-health` MCP server pointing at Crimson Health's hosted Streamable HTTP endpoint (`https://mcp.crimson.healthcare/mcp`).
- Grok Bot only (`minClientVersions`: cursor `never`, grokbot and sand `0.49.0`). Crimson's sign-in uses Client ID Metadata Documents without dynamic client registration, which Cursor desktop does not support.
- Auth uses OAuth 2.1 with PKCE and Crimson sign-in — no API key or client ID to configure.
- Logo: Crimson Health's official logomark, the `icon.svg` from crimson.healthcare.

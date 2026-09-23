# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1 — require Cursor 3.22.0

- Raised `minClientVersions.cursor` from 3.13.0 to 3.22.0. Webull's authorization server accepts a single redirect URI at dynamic client registration; only Cursor 3.22.0+ retries registration with the loopback redirect alone, so earlier clients cannot complete sign-in.

## 1.0.0 — initial release

- Added the `webull` MCP server pointing at Webull's hosted Streamable HTTP endpoint (`https://api.webull.com/mcp`).
- Auth uses OAuth with Webull user login — no API key or client ID to configure.
- Logo: Webull's official mark, from the icon Webull publishes for its connector, on a 192×192 tile.

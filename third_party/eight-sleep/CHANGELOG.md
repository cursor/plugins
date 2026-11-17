# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `eight-sleep` MCP server pointing at Eight Sleep's hosted Streamable HTTP endpoint (`https://public-api.8slp.net/mcp`).
- Auth uses OAuth with Eight Sleep user login (authorization code + PKCE, dynamic client registration, scopes `read_sleep`, `read_device`, and `write_device`) — no API key or client ID to configure.
- Logo: Eight Sleep's official "8" mark, the 180×180 web app icon published on eightsleep.com.

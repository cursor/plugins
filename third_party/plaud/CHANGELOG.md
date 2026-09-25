# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `plaud` MCP server via local stdio (`npx -y @plaud-ai/mcp@latest`).
- Auth uses Plaud browser OAuth through the server's `login` tool — no API key or client secret to configure.
- Requires Node.js ≥ 20 and `npx` on the machine running Cursor.

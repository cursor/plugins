# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `framer` MCP server pointing at Framer's hosted Streamable HTTP endpoint (`https://mcp.framer.com/mcp`), with `"placement": "server"` so Grok Bot connects through Cursor's hosted path.
- Auth uses MCP OAuth with Framer account login, Dynamic Client Registration, and PKCE — no API token, client secret, or custom header to configure.
- Logo: Framer's official black logo mark, from `https://misc.framerstatic.com/logo-black.svg` (Framer B.V.).

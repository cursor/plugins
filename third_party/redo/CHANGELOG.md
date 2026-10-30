# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `redo` MCP server pointing at Redo's hosted Streamable HTTP endpoint (`https://mcp.getredo.com/mcp`).
- Declares `"placement": "server"` so Grok Bot (desktop and mobile) dials it through the hosted MCP path and shows a connect / sign-in card.
- Auth uses OAuth 2.1 with PKCE, dynamic client registration and Redo user login — no API key or client ID to configure.
- Listed in Cursor (`3.13.0`) and Grok Bot (`0.49.0`).
- Logo: Redo's official mark, from the logo URL Redo submitted, resized to 192×192.

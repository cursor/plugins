# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1 — hosted placement

- Declares `"placement": "server"` on the MCP server so Grok Bot (desktop and mobile) dials it through the hosted MCP path. Without it the row stays UNDECIDED and never shows a connect / sign-in card in Grok Bot.

## 1.0.0 — initial release

- Added the `plaud` MCP server pointing at Plaud's hosted Streamable HTTP endpoint (`https://mcp.plaud.ai/mcp`).
- Auth uses OAuth with Plaud user login (PKCE, dynamic client registration via `mcp.plaud.ai`) — no API key or client ID to configure. Registration was verified to accept every Cursor redirect set, including Grok Bot mobile.
- Logo: Plaud's official "A" mark, from the app icon published on plaud.ai, on a 192×192 tile.

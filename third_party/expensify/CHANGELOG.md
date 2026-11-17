# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `expensify` MCP server pointing at Expensify's hosted endpoint (`https://www.expensify.com/mcp`), with `"placement": "server"` so Grok Bot dials it through the hosted MCP path.
- Auth uses OAuth 2.1 with PKCE and dynamic client registration at `https://www.expensify.com/oauth/register`. Registration was verified to accept every Cursor redirect set, including Grok Bot mobile.
- Grok Bot only (`grokbot` / `sand` 0.52.0 or newer, `cursor: "never"`).
- Logo: Expensify's official app icon, rendered at 192×192 from the SVG on new.expensify.com.

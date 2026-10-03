# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `whatsetter` MCP server pointing at WhatSetter's hosted Streamable HTTP endpoint (`https://mcp.whatsetter.com/mcp`).
- Auth is OAuth 2.1 with Dynamic Client Registration and PKCE, discovered from the server; no key or client ID in the plugin configuration. Registration was verified to accept every Cursor redirect set, including Grok Bot mobile.
- Declares `"placement": "server"` on the MCP server so Grok Bot (desktop and mobile) dials it through the hosted MCP path.
- Bundled the `whatsetter` skill: operating rules, playbooks, and the API's error table, so agents read tool results correctly and ask before anything is sent.
- Logo: WhatSetter's brand mark, from the `whatsetter` GitHub organization.

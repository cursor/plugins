# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `whatsetter` MCP server pointing at WhatSetter's hosted Streamable HTTP endpoint (`https://mcp.whatsetter.com/mcp`).
- Auth is OAuth 2.1 with Dynamic Client Registration and PKCE, discovered from the server; no key or client ID in the plugin configuration.
- Bundled the `whatsetter` skill: operating rules, playbooks, and the API's error table, so agents read tool results correctly and ask before anything is sent.
- Logo: WhatSetter's brand mark, from the `whatsetter` GitHub organization.

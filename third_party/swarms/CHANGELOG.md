# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `swarms` MCP server pointing at the Swarms Marketplace's hosted Streamable HTTP endpoint (`https://swarms.world/mcp`), exposing one tool per marketplace API operation (35 at release) for searching, publishing, editing, and reviewing listings, account details, and agent and swarm completions.
- Auth uses a Swarms API key supplied by the user as a Bearer token (`Authorization: Bearer ${SWARMS_API_KEY}`).
- Logo: Swarms' official mark (`assets/logo.svg`), as served at https://swarms.world/swarms-logo.svg.

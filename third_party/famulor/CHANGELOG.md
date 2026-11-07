# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `famulor` MCP server pointing at Famulor's hosted Streamable HTTP endpoint (`https://app.famulor.io/mcp`).
- Auth uses a Famulor workspace API key supplied by the user as a Bearer token (`Authorization: Bearer ${FAMULOR_API_KEY}`).
- `FAMULOR_API_KEY` is required, write-only, and the only variable (`additionalProperties: false`).
- Listed in Cursor (`3.13.0`).
- Logo: Famulor's official cyan toggle mark, from `https://www.famulor.io/images/famulor-fav.png`, on a 192×192 tile.

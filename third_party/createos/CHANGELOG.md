# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `createos` MCP server pointing at NodeOps' hosted Streamable HTTP endpoint (`https://api-createos.nodeops.network/mcp`).
- Auth uses a CreateOS API key sent as `X-Api-Key`, the path NodeOps documents for Cursor. The server also offers OAuth with dynamic client registration, but its registration backend rejects Cursor's `cursor://` callback, so OAuth sign-in from Cursor fails today.
- Logo: the NodeOps mark, the 512×512 app icon published on nodeops.network, resized to 256×256.

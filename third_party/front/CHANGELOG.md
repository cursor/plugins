# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `front` MCP server pointing at Front's hosted Streamable HTTP endpoint (`https://mcp.frontapp.com/mcp`).
- Declared `CLIENT_ID` and `CLIENT_SECRET` plugin variables and forwarded them through MCP auth, since Front requires a confidential client and does not support dynamic client registration.
- Requested the `feature:mcp` scope, the value Front documents for clients that need one.
- Logo: Front's official 192×192 app icon.

# Changelog

All notable changes to this plugin will be documented here.

## 1.1.1

- Removed the `auth` block from the `front` MCP server. It had no `CLIENT_ID`, which made the whole `mcp.json` fail to parse, so the server was dropped and the plugin showed no connector. Cursor now supplies the Front OAuth client and scope.

## 1.1.0

- Dropped the `CLIENT_ID` and `CLIENT_SECRET` plugin variables and the MCP auth values that forwarded them. The connection keeps the `feature:mcp` scope and no longer asks users for Front developer app credentials.
- README: replaced the developer app setup with the install-and-sign-in path.

## 1.0.0 — initial release

- Added the `front` MCP server pointing at Front's hosted Streamable HTTP endpoint (`https://mcp.frontapp.com/mcp`).
- Declared `CLIENT_ID` and `CLIENT_SECRET` plugin variables and forwarded them through MCP auth, since Front requires a confidential client and does not support dynamic client registration.
- Requested the `feature:mcp` scope, the value Front documents for clients that need one.
- Logo: Front's official 192×192 app icon.

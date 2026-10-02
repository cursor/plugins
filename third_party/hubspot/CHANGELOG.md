# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1

- Made `CLIENT_ID` and `CLIENT_SECRET` optional. Leaving them blank uses Grok's HubSpot app where it is available.

## 1.0.0 — initial release

- Logo: HubSpot's official inverted favicon (white sprocket on the brand orange tile).
- Added the `hubspot` MCP server pointing at `https://mcp.hubspot.com`.
- Declared `CLIENT_ID` and `CLIENT_SECRET` plugin variables and forwarded them through MCP auth.

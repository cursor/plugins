# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- `CLIENT_ID` and `CLIENT_SECRET` are optional. Left empty, Grok Bot registers its own Gong client instead of stopping at "OAuth client is not configured".
- README: dropped the `http://localhost:8787/callback` redirect, which Gong rejects, and documented the no-setup path.

## 1.0.0 — initial release

- Logo: Gong's official 180×180 apple-touch icon.
- Added the `gong` MCP server pointing at `https://mcp.gong.io/mcp`.
- Declared `CLIENT_ID` and `CLIENT_SECRET` plugin variables and forwarded them through MCP auth.

# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1

- Added `minClientVersions.sandMobile: "never"`. Robinhood refuses sign-in from phone browsers (its page says to use a desktop browser), so Grok Bot's mobile app no longer lists the plugin. Desktop is unchanged.

## 1.0.0 — initial release

- Added the `robinhood` MCP server pointing at Robinhood's hosted Streamable HTTP endpoint (`https://agent.robinhood.com/mcp/trading`).
- Auth uses OAuth with Robinhood user login (PKCE, dynamic client registration) — no API key or client ID to configure.
- Logo: Robinhood's official feather mark on its brand-green tile, from the icon Robinhood publishes for its site, on a 192×192 tile.

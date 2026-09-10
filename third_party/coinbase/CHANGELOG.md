# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `coinbase` MCP server pointing at Coinbase's hosted Streamable HTTP endpoint (`https://agents.coinbase.com/mcp`).
- Auth uses OAuth with Coinbase user login. Declared `CLIENT_ID` and `CLIENT_SECRET` plugin variables and forwarded them through MCP auth, since `login.coinbase.com` does not support dynamic client registration.
- Logo: Coinbase's official mark, from the `coinbase` GitHub organization.

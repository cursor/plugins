# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `nooks` MCP server pointing at Nooks' hosted Streamable HTTP endpoint (`https://mcp.nooks.in/mcp`).
- Nooks' OAuth server (`https://oauth.nooks.in`) has no dynamic client registration and only accepts `client_secret_post`, so the plugin declares `CLIENT_ID` and `CLIENT_SECRET` variables for a Nooks OAuth app and forwards them through MCP auth.
- Logo: the Nooks mark from the nooks.ai favicon, rendered at 256×256.

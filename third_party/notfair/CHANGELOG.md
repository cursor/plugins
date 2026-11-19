# Changelog

All notable changes to this plugin will be documented here.

## 0.27.9 — initial Cursor marketplace packaging

- Added the `NotFair` MCP server pointing at NotFair's hosted Streamable HTTP endpoint (`https://notfair.co/api/mcp/notfair`).
- Auth is OAuth 2.1 with Dynamic Client Registration and PKCE, discovered from the server; no client ID or secrets in the plugin configuration.
- Logo: NotFair's brand mark, from [nowork-studio/notfair-plugin](https://github.com/nowork-studio/notfair-plugin).
- Open-source SEO, GEO, and content skills stay in the source repository (they wrap canonical files outside `skills/` and would make this packaging PR unwieldy).

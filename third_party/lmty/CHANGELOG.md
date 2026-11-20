# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `lmty` MCP server pointing at LMTY's hosted Streamable HTTP endpoint (`https://mcp.lmty.dev/mcp`).
- Public tools (curated Markets, public feed, calendar, connections, and company/product/person profiles) work without signing in. Account tools (your own products, competitors, reports, evidence, mentions, market feed, and customers) use OAuth 2.0 Authorization Code with PKCE (S256) and Dynamic Client Registration against `lmty.dev/auth`, scopes `openid`, `email`, `mcp`, `offline_access`. No API key or client ID to configure.
- Logo: LMTY's official wordmark (`icon.svg`, as published on lmty.dev and advertised by the server's `serverInfo.icons`), rendered at 256×256 on a light background with the same padding as LMTY's `apple-icon.png`.

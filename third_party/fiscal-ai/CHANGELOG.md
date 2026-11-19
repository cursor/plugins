# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `fiscal-ai` MCP server pointing at Fiscal.ai's hosted Streamable HTTP endpoint (`https://api.fiscal.ai/mcp`).
- Auth uses OAuth 2.1 with Dynamic Client Registration and PKCE (S256) against `api.fiscal.ai`. The server advertises the `financials`, `financials_sourcing`, `segments_and_kpis`, `stock_quotes`, `filings`, `adjusted_numbers`, `news`, `ir_events`, `ownership`, `fund_letters`, `funds`, and `fiscal_earnings_calendar` scopes.
- Logo: Fiscal.ai's official app icon, the 512×512 PNG published on docs.fiscal.ai, resized to 256×256.

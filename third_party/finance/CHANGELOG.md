# Changelog

All notable changes to this plugin will be documented here.

## 1.1.1 — Pre-connect disclosure

- The listing description now says what connecting does (Plaid link), what data is shared (contact details, account and balance info, transactions, credit and loans, investments), that Grok syncs and stores linked account data for the connector to work while privacy mode still governs conversation storage and training, that access is read-only, that xAI never sees or stores bank logins, and that accounts can be unlinked from cursor.com.
- Same text in the README. No server or client-version changes.

## 1.1.0 — MCP server

- Added the `finance` MCP server pointing at `https://connectors-gateway.grok.com/gateway/v1/finance/mcp`, the streamable-HTTP transport of the Grok Finance connector.
- Auth is the caller's linked Grok account, attached by the Cursor backend; no client sign-in prompt.
- Still Grok Bot 0.49 or newer only, and never allowed in Cursor.

## 1.0.0 — initial release

- Added an empty Finance marketplace card that mirrors the Grok Finance connector.
- No skills and no connector are bundled. The Cursor backend handles this plugin.
- Requires Grok Bot 0.49 or newer, and is never allowed in Cursor.

# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `x-money` MCP server pointing at X Money's hosted Streamable HTTP endpoint (`https://mcp.money.x.com/mcp`), declared `placement: "server"` because the OAuth grant and tool calls live on the Cursor backend.
- Auth is OAuth 2.1 with PKCE. The Cursor backend is a registered confidential client of X Money, so the plugin ships no client ID, secret, or variables. Consent is a connection code approved with a passkey in the X app.
- Added the X Money guide skill: how the connection-code and passkey flow works, how to guide a user through connect, reconnect, and revoke at `x.com/i/money/settings/connections`, what each refusal means, and the approval rule for actions that move money.
- Grok Bot only (`grokbot` / `sand` 0.52.0 or newer, `cursor: "never"`).
- Logo: X Money's official mark.

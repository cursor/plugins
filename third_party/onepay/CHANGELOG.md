# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — Initial release

- Display name "OnePay" (slug `onepay`).
- `rules/onepay.mdc`: routes OnePay account questions to the MCP tools, discovers tools from the server list, and maps common questions to the right tool calls.
- Grok Bot only (`minClientVersions`: cursor `never`, grokbot and sand `0.49.0`).
- Hosted MCP at `https://mcp.onepay.com` (Streamable HTTP, OAuth 2.1 + PKCE).

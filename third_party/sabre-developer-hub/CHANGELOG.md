# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `sabre-developer-hub` MCP server pointing at Sabre's hosted Streamable HTTP endpoint for the Developer Hub Documentation MCP server (`https://developer.mcp.sabre.com/mcp`).
- No auth — the server serves only public Developer Hub content and is read-only. A static `X-Cursor-Plugin: sabre-developer-hub` header is sent so hosts treat the server as anonymous instead of OAuth-gated.
- Logo: the Sabre mark from the Developer Hub favicon, in white on the red of the sabre.com favicon, rendered at 256×256.

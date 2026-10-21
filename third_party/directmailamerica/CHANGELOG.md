# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `directmailamerica` MCP server pointing at DirectMailAmerica's hosted endpoint (`https://directmailamerica.com/api/mcp`).
- Auth uses a user-supplied workspace API key (`DIRECTMAILAMERICA_API_KEY`), sent as a Bearer header.
- Skills: `dma-send-mail`, `dma-email-to-letter`, `dma-order-status`. Mailing always requires explicit approval of the preview and price.
- Logo: DirectMailAmerica's official mark.

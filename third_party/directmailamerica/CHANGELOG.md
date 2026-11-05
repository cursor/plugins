# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `directmailamerica` MCP server pointing at DirectMailAmerica's hosted endpoint (`https://directmailamerica.com/api/mcp`).
- Auth uses a user-supplied workspace API key (`DIRECTMAILAMERICA_API_KEY`), sent as a Bearer header.
- Skills: `dma-send-mail`, `dma-email-to-letter`, `dma-order-status`. Mailing always requires explicit approval of the preview and price.
- Logo: DirectMailAmerica's official mark.

## 1.1.0 — DirectMailAmerica MCP update (Oct 2026)

- Tracks the updated hosted MCP (37 → 71 tools): Email to Postcard, double-sided 8.5 × 5.5 postcards (`reverseMessage` / `reverseArtworkBase64`), `preview_letter` and quote proofs, address book and `validate_address`, cover sheets, postcard artwork generation/conversion, job details and documents, billing history, workspace and webhook settings.
- Auth now uses the server's OAuth Connect flow with scoped read/write/send permissions (matching DirectMailAmerica's own plugin); the plugin no longer requires an API key variable or sends a Bearer header.
- New skill `dma-email-to-postcard`; `dma-send-mail` and `dma-order-status` updated for the new tools. Mailing, funding and autosend still require explicit approval.

# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1

- Added an optional **Xero scopes** setup field, passed to the server as `XERO_SCOPES`. Custom Connections created on or after 2026-04-29 need it, because Xero rejects the server's default bundled-scope request for them with `invalid_client`.

## 1.0.0 — initial release

- Added the `xero` MCP server, running `@xeroapi/xero-mcp-server` locally over stdio.
- Auth uses a Xero Custom Connection client ID and secret supplied by the user.
- Logo: Xero's official mark, from the `XeroAPI` GitHub organization.

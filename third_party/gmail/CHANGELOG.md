# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1 — filter tools OAuth note

- Documented that `create_filter` / `list_filters` (and related filter tools) need `https://www.googleapis.com/auth/gmail.settings.basic`.
- This plugin still does not declare OAuth scopes: Google Workspace sign-in uses Cursor's first-party client against `https://gmailmcp.googleapis.com/mcp/v1`.
- After that scope is added to the connector OAuth client, existing installs must disconnect Gmail and sign in again.

## 1.0.0 — initial release

- Logo: official Gmail 2026 product icon from Google productlogos, on a padded white tile.
- Added the `gmail` MCP server pointing at `https://gmailmcp.googleapis.com/mcp/v1`.

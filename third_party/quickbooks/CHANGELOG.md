# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `quickbooks` MCP server, running Intuit's official `quickbooks-online-mcp-server` locally over stdio via `npx github:intuit/quickbooks-online-mcp-server`.
- Auth uses an Intuit Developer app's client ID and secret plus a refresh token and realm ID supplied by the user; the environment selects sandbox or production.
- Logo: QuickBooks's official "qb" mark on the brand green, from the `IntuitDeveloper` GitHub organization.

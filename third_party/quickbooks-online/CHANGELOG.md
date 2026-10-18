# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- Added `mcp.json`: the plugin now declares Intuit's hosted HTTP MCP server at `https://mcp-e2e.quickbooks.intuit.com/mcp` instead of relying on a Cursor-side server definition.
- Auth is unchanged in shape — Cursor-managed OAuth against Intuit, authorized per company file — but it is now the native OAuth client, so existing installs have to reauthorize.

## 1.0.0 — initial release

- Added the `quickbooks-online` plugin, the opt-in for the QuickBooks Online MCP server that Cursor hosts and credentials.
- Carries no MCP server definition: the server is Cursor-side, so installing the plugin is the whole configuration.
- Auth is Cursor-managed OAuth against Intuit, authorized per company file.
- Logo: QuickBooks' official mark, from `quickbooks.intuit.com`.

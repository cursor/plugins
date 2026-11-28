# Changelog

All notable changes to this plugin will be documented here.

## 1.2.0

- Renamed the plugin to **Intuit QuickBooks**. The plugin id stays `quickbooks-online`, so installs carry over.
- Rewrote the description around reporting, invoicing and payment links, customers and products, payroll preview, CSV transaction import, and QuickBooks Capital.
- Moved the plugin to the `finance-and-legal` category.
- Refreshed the logo with Intuit's current QuickBooks mark.

## 1.1.1

- Updated the plugin description to cover financial insights, invoicing, payroll, and QuickBooks Capital.

## 1.1.0

- Added `mcp.json`: the plugin now declares Intuit's hosted HTTP MCP server at `https://mcp-e2e.quickbooks.intuit.com/mcp` instead of relying on a Cursor-side server definition.
- Auth is unchanged in shape — Cursor-managed OAuth against Intuit, authorized per company file — but it is now the native OAuth client, so existing installs have to reauthorize.

## 1.0.0 — initial release

- Added the `quickbooks-online` plugin, the opt-in for the QuickBooks Online MCP server that Cursor hosts and credentials.
- Carries no MCP server definition: the server is Cursor-side, so installing the plugin is the whole configuration.
- Auth is Cursor-managed OAuth against Intuit, authorized per company file.
- Logo: QuickBooks' official mark, from `quickbooks.intuit.com`.

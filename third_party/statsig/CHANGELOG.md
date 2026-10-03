# Changelog

All notable changes to this plugin will be documented here.

## 2.0.0

- Switch the hosted MCP endpoint to `https://api.statsig.com/v3/mcp`.
- MCP v3 changes tool names and input schemas; use the advertised tool catalog and `discover_tools` for capabilities that are not visible.
- Add upgrade guidance for reconnecting, refreshing the tool catalog, and migrating manually configured connections.

## 1.0.0 — initial release

- Added the `statsig` MCP server pointing at Statsig's hosted Streamable HTTP endpoint (`https://api.statsig.com/v1/mcp`).
- Auth uses OAuth with Statsig user login — no Console API key or client ID to configure.
- Logo: Statsig's official mark, from the `statsig-io` GitHub organization.

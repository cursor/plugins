# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `salesforce-headless-360` MCP server for Salesforce's Headless 360 (Beta) hosted MCP server.
- Declared required `SALESFORCE_MCP_URL`, `CLIENT_ID`, and `CLIENT_SECRET` plugin variables, labeled as values a Salesforce admin sets once for the team. The server URL defaults to the production Headless 360 URL.
- Pinned OAuth scopes to `mcp_api` and `refresh_token`.
- Logo: the same Salesforce mark as the `salesforce` plugin.

# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- Recommended Salesforce's Headless 360 (Beta) server for new setups, with production and sandbox URLs and the activation step. Existing SObject and custom server URLs keep working unchanged.
- Labeled the server URL and Consumer Key as values a Salesforce admin sets once for the team, and told members they only need to sign in.
- Added admin setup, migration, and approval guidance for `dispatch` to the README.
- No change to the MCP server key, variable names, OAuth scopes, or client flow, so existing installs keep their configuration and sign-in.

## 1.0.0 — initial release

- Logo: Salesforce's official cloud mark, centered on a transparent 192×192 canvas with padding so it reads well on light and dark backgrounds.
- Added the `salesforce` MCP server backed by Salesforce Hosted MCP.
- Declared `SALESFORCE_MCP_URL` and `CLIENT_ID` plugin variables so each org can point at its own server and External Client App.
- Pinned OAuth scopes to `mcp_api` and `refresh_token`.

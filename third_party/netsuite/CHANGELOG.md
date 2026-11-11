# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `netsuite` MCP server pointing at the NetSuite AI Connector Service over Streamable HTTP.
- The server URL is account-specific, so `NETSUITE_MCP_URL` is a required plugin variable. Both documented forms work: `/services/mcp/v1/all` and `/services/mcp/v1/suiteapp/<applicationid>`.
- Auth uses OAuth with NetSuite user sign-in (authorization code + PKCE, dynamic client registration, scope `mcp`) — no client ID or secret to configure.
- Logo: NetSuite's official mark, from the NetSuite iOS app icon published by Oracle America.

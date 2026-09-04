# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Logo: SharePoint-style mark in Microsoft's SharePoint brand colors, on a padded white tile.
- Added the `sharepoint` MCP server pointing at Microsoft's Agent 365 Work IQ SharePoint server (`https://agent365.svc.cloud.microsoft/agents/tenants/{tenantId}/servers/mcp_SharePointRemoteServer`, preview).
- Declared `TENANT_ID` and `CLIENT_ID` plugin variables so each tenant supplies its own Entra tenant and public-client app registration. No client secret is used.

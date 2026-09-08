# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `microsoft-ads` MCP server pointing at Microsoft's hosted Microsoft Advertising MCP server, `https://partner.api.bingads.microsoft.com/ext/mcp/vnext?toolSetNames=OpenBeta`.
- OAuth user sign-in through Microsoft Entra ID using a customer-registered app registration (`CLIENT_ID` plugin variable), requesting `https://ads.microsoft.com/msads.manage` and `offline_access`. Cursor authenticates as a public client with PKCE, so no client secret is stored.
- Logo: Microsoft's four-square symbol on a white tile with padding, matching the Outlook and OneDrive plugins.

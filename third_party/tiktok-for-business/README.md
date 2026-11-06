# TikTok for Business

Cursor plugin that connects agents to [TikTok for Business](https://ads.tiktok.com) through TikTok's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Manage TikTok ad campaigns, ad groups, ads, audiences, creatives, and reports.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **TikTok for Business**.
3. Click **Install**, then complete the TikTok for Business sign-in prompt.

Or run `/add-plugin tiktok-for-business` in chat.

## MCP

```json
{
  "mcpServers": {
    "tiktok-for-business": {
      "type": "http",
      "url": "https://business-api.tiktok.com/open_mcp/tt-ads-mcp-layer"
    }
  }
}
```

This is TikTok's Progressive Disclosure server. It loads about 40 core tools when it connects and loads the rest of its roughly 400 tools when the agent needs them, which keeps the tool list small. TikTok also runs a Full Disclosure server at `https://business-api.tiktok.com/open_mcp/tt-ads-mcp-flat` that loads every tool at once.

Auth is OAuth with Dynamic Client Registration and PKCE. Cursor registers itself and opens TikTok's sign-in when the plugin connects: sign in with your TikTok for Business account (Ads Manager), review the permissions, and click **Authorize**. There is no API key, developer app, or client ID to configure. Authorization lasts 30 days, after which you sign in again.

## What agents can do

Tools wrap TikTok Business API v1.3 endpoints:

| Area | Examples |
| --- | --- |
| Accounts | Authorized advertisers, advertiser info, Business Center |
| Campaigns and ads | Campaigns, ad groups, and ads, including Upgraded Smart+ |
| Reporting | Performance reports by dimension and metric |
| Audiences | Custom and saved audiences, pixels, custom conversions |
| Creatives | Images, videos, music, identities, creative portfolios |
| Catalogs | Catalogs, product sets, feeds, and products |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Some tools create, update, and change the status of campaigns, ad groups, and ads, which can spend ad budget. Review every tool call before you approve it.
- Each tool is limited to 6 requests per second per user.
- To revoke access, remove the plugin.

## Docs

- TikTok for Business MCP Server: https://business-api.tiktok.com/portal/docs/tiktok-ads-mcp-server/v1.3
- Connection guide: https://business-api.tiktok.com/portal/docs/how-to-connect-to-tiktok-for-business-mcp-server/v1.3
- Available tools: https://business-api.tiktok.com/portal/docs/available-tools-in-tiktok-for-business-mcp-server/v1.3
- Server URL: https://business-api.tiktok.com/open_mcp/tt-ads-mcp-layer

Logo is TikTok's official app icon.

## License

MIT

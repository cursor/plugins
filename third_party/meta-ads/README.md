# Meta Ads

Cursor plugin that connects agents to [Meta's ads platform](https://www.facebook.com/business/ads) through Meta's official hosted [Model Context Protocol](https://modelcontextprotocol.io/) server at `https://mcp.facebook.com/ads`.

This plugin signs you in with Facebook Login for Business and works with the business portfolios and ad accounts you choose to share. Agents can manage campaigns, ad sets, ads, audiences, and catalogs, and pull performance insights across Facebook and Instagram.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Meta Ads**.
3. Click **Install**, then complete the Facebook sign-in when prompted.

Or run `/add-plugin meta-ads` in chat.

## MCP

```json
{
  "mcpServers": {
    "meta-ads": {
      "type": "http",
      "url": "https://mcp.facebook.com/ads",
      "auth": {
        "CLIENT_ID": "1854843612533787"
      }
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | Read the ad accounts and business portfolios you shared |
| Insights | Pull performance insights |
| Campaigns | Create, update, and read campaigns |
| Ad sets | Create, update, and read ad sets |
| Ads & creatives | Create and manage ads and creatives |
| Audiences | Read and manage audiences |
| Datasets & pixels | Read and manage datasets and pixels |
| Catalogs | Read and manage product catalogs |

The hosted server is the source of truth for tool names and schemas.

## Setup

No token to paste. The plugin ships Cursor's Meta app ID, because Meta does not accept dynamic client registration from Cursor. A Meta app ID is public, and the plugin needs no client secret.

On first use, Cursor opens a browser window for Facebook Login for Business. Sign in, pick the business portfolios and ad accounts to share, and approve access. Requests run as you, against only the assets you shared.

You can revoke access at any time on Facebook under **Settings → Business Integrations**.

## Notes

- Meta calls the server beta and rolls it out per ad account and per tool. If a tool reports `is_ads_mcp_enabled = false`, that ad account does not have access yet.
- The server can write, including creating campaigns and changing budgets. Review every tool call before you approve it.
- Calls share the Marketing API's rate limits for each ad account.

## Docs

- Ads MCP server, get started: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started
- Meta Business Help Center: https://www.facebook.com/business/help/1456422242197840

Logo is Meta's mark from [Simple Icons](https://simpleicons.org/), in Meta blue (`#0081FB`) on a white tile.

## License

MIT

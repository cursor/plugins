# NotFair

Cursor plugin that connects agents to [NotFair](https://notfair.co) through NotFair's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Operate Google, Meta, X, LinkedIn, Reddit, and TikTok Ads plus GA4, Search Console, GoHighLevel, and WordPress from one OAuth connection. Connect those platforms inside the NotFair workspace selected during sign-in; do not add an MCP server per platform.

Homepage: https://notfair.co

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **NotFair**.
3. Click **Install**, then complete the NotFair sign-in prompt.

Or run `/add-plugin notfair` in chat.

## MCP

```json
{
  "mcpServers": {
    "NotFair": {
      "type": "http",
      "url": "https://notfair.co/api/mcp/notfair"
    }
  }
}
```

Auth is OAuth 2.1 against NotFair with Dynamic Client Registration (DCR) and PKCE, discovered from the server (`WWW-Authenticate` and protected-resource metadata). Cursor registers itself and opens the Connect to NotFair page on the first tool call. There is no API key or client ID to configure in the plugin.

Protected-resource metadata: https://notfair.co/.well-known/oauth-protected-resource/api/mcp/notfair

## Before you connect

You need a NotFair account at [notfair.co](https://notfair.co). After OAuth, connect the ad, analytics, WordPress, or GoHighLevel accounts you want to use inside that workspace. Tool calls cannot exceed the platforms and permissions of the signed-in workspace.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Google Ads | Review campaigns, search terms, keywords, bids, and budgets, and make approved account changes |
| Meta Ads | Review Facebook and Instagram campaigns, ad sets, creatives, and insights |
| X Ads | Review campaigns and line items, targeting, creative, and conversion performance |
| LinkedIn Ads | Review campaign groups, campaigns, creatives, analytics, targeting, and leads |
| Reddit Ads | Review campaigns, ad groups, ads, audiences, and reporting |
| TikTok Ads | Review advertiser delivery, creative performance, targeting, and budgets |
| Analytics | Query GA4 acquisition, engagement, and conversions, plus Search Console queries, pages, URL inspection, and sitemaps |
| WordPress | Read and update connected site content, media, comments, design, settings, and plugins |
| GoHighLevel | Read contacts, conversations, opportunities, and calendars, then make only explicitly requested CRM changes |

The hosted runtime is the source of truth for tool names and schemas. Choose tools from the live server's instructions and capability descriptions.

## Notes

- This package is MCP-first. Open-source SEO, GEO, and content skills live in the source repository: https://github.com/nowork-studio/notfair-plugin
- Writes stay within the signed-in workspace and the user's authorization. Confirm the target account and intended effect before mutating ads, content, or CRM records.
- One NotFair connection covers every supported platform. Do not add a second NotFair MCP server to reach another channel.
- Revoke access from the NotFair workspace or by disconnecting the plugin in Cursor.

## Docs

- Homepage: https://notfair.co
- Privacy: https://notfair.co/privacy
- Terms: https://notfair.co/terms
- Source plugin repository: https://github.com/nowork-studio/notfair-plugin
- Server URL: https://notfair.co/api/mcp/notfair
- Protected-resource metadata: https://notfair.co/.well-known/oauth-protected-resource/api/mcp/notfair

Logo is NotFair's official mark, from the `nowork-studio/notfair-plugin` GitHub repository.

## License

MIT

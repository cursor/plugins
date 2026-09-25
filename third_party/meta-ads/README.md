# Meta Ads

Cursor plugin that connects agents to [Meta Ads](https://www.facebook.com/business/ads) through Meta's official remote [Model Context Protocol](https://modelcontextprotocol.io/) Ads MCP server.

Manage Facebook and Instagram ad accounts from chat — reporting, campaign creation (writes start paused), catalogs, signals, A/B tests, lift studies, activity logs, and Ad Library search.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Meta Ads**.
3. Click **Install**, then complete the Meta sign-in prompt.

Or run `/add-plugin meta-ads` in chat.

## MCP

```json
{
  "mcpServers": {
    "meta-ads": {
      "type": "http",
      "url": "https://mcp.facebook.com/ads"
    }
  }
}
```

Auth is OAuth against your Facebook account or Meta Managed Account via Facebook Login for Business. Cursor prompts for sign-in when the plugin connects.

## Before you connect

Owning a Meta developer app is **not** required for Meta's first-party connector path (see [Manage ads from an AI agent with Meta Ads AI connectors](https://www.facebook.com/business/help/1456422242197840)). That path is documented for ChatGPT, Claude, Claude Code, and Perplexity; Cursor may fall into the same flow or may need an app-based setup.

If OAuth asks for a Meta app client ID (same pattern as Claude Code / ChatGPT Advanced OAuth):

1. Create or open an app at [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Add the **Create & manage ads with ads MCP server** use case.
3. In Facebook Login for Business, set redirect URLs for your MCP client (for Cursor Desktop that typically includes `http://localhost:8787/callback` and `cursor://anysphere.cursor-mcp/oauth/callback`).
4. Use that app's ID as the OAuth client ID when connecting.

Minimum token scopes (user or Employee system user): `ads_mcp_management` plus `ads_read` or `ads_management`. Additional scopes unlock more tools: `ads_management`, `catalog_management`, `business_management`, `pages_show_list`, `instagram_basic`. Admin-role system user tokens are **not** supported.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Reporting | Campaign / ad set / ad metrics, opportunity score, anomaly and benchmark insights |
| Creation & management | Create and edit campaigns, ad sets, ads, creatives (new entities start **paused**; activation is a separate step) |
| Catalogs | Catalog and product data, feed troubleshooting |
| Signals | Signal health and dataset quality |
| Experiments | A/B tests and conversion lift studies |
| Activity | Ad account activity logs |
| Research | Meta Ad Library search; Instagram boost-eligible media |

The hosted server is the source of truth for tool names and schemas.

## Notes

- Server URL: `https://mcp.facebook.com/ads`.
- Some ad accounts still return empty tools after a successful OAuth until Meta enables `is_ads_mcp_enabled` for that account (phased rollout).
- Write tools create paused entities; the agent should confirm before `ads_activate_entity`.
- AI agents act with your granted scopes — prefer Read unless Manage is required ([Meta Platform Terms](https://developers.facebook.com/terms) apply).

## Docs

- Ads MCP overview: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview
- Get started: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started
- Business Help (no-app path): https://www.facebook.com/business/help/1456422242197840
- Server URL: https://mcp.facebook.com/ads

## License

MIT

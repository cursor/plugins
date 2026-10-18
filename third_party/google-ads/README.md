# Google Ads

Cursor plugin that connects Grok Bot to [Google Ads](https://ads.google.com) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Report on accounts and campaigns with GAQL, research keywords and audiences, and make campaign changes. Every change is checked with `validate_mutate` (`validateOnly`) before `mutate` applies it.

## Install

1. Open **Grok Bot Settings → Plugins**.
2. Search for **Google Ads**.
3. Click **Install**, then complete the Google sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "google-ads": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/google-ads/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Google with the `https://www.googleapis.com/auth/adwords` scope. Grok Bot prompts for Google sign-in when the plugin connects.

## Tools

- **Reporting:** `list_accessible_customers`, `search`, `search_fields`, `list_billing`, `get_operation`
- **Planning:** `keyword_planner`, `reach_planner`, `audience_insights`, `benchmarks`, `suggest`, `generate_assets`
- **Changes:** `validate_mutate`, `mutate`, `recommendation_action`, `experiment_action`, `upload_conversions`

## Docs

- Google Ads API: https://developers.google.com/google-ads/api/docs/start
- GAQL: https://developers.google.com/google-ads/api/docs/query/overview

Logo is the official Google Ads product icon, placed on a white tile with padding so it reads well in the UI.

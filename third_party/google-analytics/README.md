# Google Analytics

Cursor plugin that connects Grok Bot to [Google Analytics](https://analytics.google.com) (GA4) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run reports, read property configuration and change history, and manage custom dimensions, metrics, key events, data streams and annotations.

## Install

1. Open **Grok Bot Settings → Plugins**.
2. Search for **Google Analytics**.
3. Click **Install**, then complete the Google sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "google-analytics": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/google-analytics/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Google with the `https://www.googleapis.com/auth/analytics.readonly` and `https://www.googleapis.com/auth/analytics.edit` scopes. Grok Bot prompts for Google sign-in when the plugin connects.

## Tools

- **Reporting:** `run_report`, `run_realtime_report`, `run_funnel_report`, `get_metadata`, `check_compatibility`, `audience_export`
- **Configuration:** `list_account_summaries`, `get_config`, `search_change_history`, `run_access_report`, `list_annotations`
- **Changes:** `update_config`, `delete_config`, `manage_data_policy`, `manage_annotations`

## Docs

- Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
- Google Analytics Admin API: https://developers.google.com/analytics/devguides/config/admin/v1

Logo is the official Google Analytics product icon, placed on a white tile with padding so it reads well in the UI.

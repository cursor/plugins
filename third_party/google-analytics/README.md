# Google Analytics

Cursor plugin that connects agents to [Google Analytics](https://analytics.google.com) through Google's remote [Model Context Protocol](https://modelcontextprotocol.io/) server for the Google Analytics Data API.

Run standard and realtime reports against GA4 properties, look up available dimensions and metrics (including custom definitions), and check dimension/metric compatibility before running a query.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Analytics**.
3. Click **Install**, then complete the Google sign-in prompt.

Or run `/add-plugin google-analytics` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-analytics": {
      "type": "http",
      "url": "https://analyticsdata.googleapis.com/mcp/v1"
    }
  }
}
```

The `/mcp/v1` toolset exposes `run_report`, `run_realtime_report`, `get_metadata`, and `check_compatibility`. Access is read-only.

Auth is OAuth 2.0 against Google. Cursor prompts for Google sign-in when the plugin connects.

### OAuth scopes

Google's Workspace MCP servers (Gmail, Google Drive, Google Calendar) and the Analytics Data MCP server all authenticate with Google OAuth, so this plugin may reuse Cursor's existing Google Workspace OAuth clients. The Analytics server needs scopes those clients do not request today, notably `https://www.googleapis.com/auth/analytics.readonly`, and adding them requires updating the OAuth consent screen and re-running Google's consent-screen verification for the new scopes. This plugin is packaging only; wiring the additional scopes into Cursor's auth backend is tracked separately and is not part of this plugin.

## Docs

- Google Analytics Data API MCP reference: https://developers.google.com/analytics/devguides/reporting/data/v1/mcp
- Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
- Google Cloud MCP servers overview: https://docs.cloud.google.com/mcp/overview

Logo is the official Google Analytics product mark, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT

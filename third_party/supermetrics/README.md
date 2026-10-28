# Supermetrics

Cursor plugin that connects agents to [Supermetrics](https://supermetrics.com) through Supermetrics' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Supermetrics connects your marketing data from 170+ sources, including Google Ads, Meta Ads, Google Analytics 4, LinkedIn, TikTok, HubSpot, and Shopify. Ask questions in plain language and get live numbers back: compare campaign performance, report across channels, analyze social engagement, and manage ad campaigns, with no exports or spreadsheets.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Supermetrics**.
3. Click **Install**, then complete the Supermetrics sign-in prompt.

Or run `/add-plugin supermetrics` in chat.

## MCP

```json
{
  "mcpServers": {
    "supermetrics": {
      "type": "http",
      "url": "https://mcp.supermetrics.com/mcp"
    }
  }
}
```

## Before you connect

You need a Supermetrics account with at least one data source connected.

## Example prompts

- "Which data sources do I have connected in Supermetrics?"
- "Show my GA4 sessions and users by channel for the last 30 days."
- "Which channel grew the most compared to the previous 30 days?"

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Supermetrics account and data source permissions of the user who authorizes the connection.

## Docs

- Supermetrics: https://supermetrics.com
- Server URL: https://mcp.supermetrics.com/mcp

Logo is the avatar of the `supermetrics` GitHub organization. supermetrics.com refused automated requests when this plugin was added, so the submitted logo (`https://supermetrics.com/favicon.png?v=1`) was not downloaded.

## License

MIT

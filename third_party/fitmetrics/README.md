# FitMetrics

Cursor plugin that connects agents to [FitMetrics](https://www.fitmetrics.ai) through FitMetrics' official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Review your ABC Trainerize clients, check-ins, measurements, meals, and workouts, and update macros, messages, habits, and workout programs. FitMetrics is ABC Fitness's coaching add-on for Trainerize.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FitMetrics**.
3. Click **Install**, then set your FitMetrics API key (below).

Or run `/add-plugin fitmetrics` in chat.

## MCP

```json
{
  "mcpServers": {
    "fitmetrics": {
      "type": "http",
      "url": "https://app.fitmetrics.ai/mcp",
      "headers": {
        "Authorization": "Bearer ${FITMETRICS_API_KEY}"
      }
    }
  }
}
```

Auth is a FitMetrics **API key** sent as `Authorization: Bearer`. In FitMetrics, open **Settings → Integrations → MCP**, click **Create API Key**, choose **Other MCP app**, then name the key and pick its coach and tool permissions. Set the key in **Dashboard → Plugins → Configure**. Do not commit the key.

## Before you connect

You need ABC Trainerize with the FitMetrics **Scale** package, the only package with MCP access. Coaches can create their own key, and it reaches only their assigned clients. Write actions stay off until an owner or admin turns them on.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Clients | Morning briefing, client dossiers, measurements, habits, and tags |
| Check-ins | Review check-ins, and create and manage AI check-in templates and AI Forms |
| Nutrition | Meals and macros, including scheduled macro changes in Trainerize |
| Training | Workouts, cardio, 1:1 bookings, and building, copying, scheduling, and assigning programs |
| Messaging | Messages, scheduled and bulk messages, email, comments, and reactions |
| Automations | Create and manage FitMetrics automations |

FitMetrics lists 359 tools (137 read, 222 write). The hosted runtime is the source of truth for tool names and schemas.

## Notes

- FitMetrics offers OAuth sign-in only to Claude and ChatGPT, and its dynamic client registration rejects Cursor's OAuth callback. This plugin uses the API key path FitMetrics documents for Cursor and other MCP apps.
- Changes made through the server are confirmed, scoped, and logged in FitMetrics.

## Docs

- Connect AI tools to FitMetrics via MCP: https://app.fitmetrics.ai/docs/faq/connect-ai-tools-to-fitmetrics-via-mcp-claude-chatgpt-openclaw-more
- ABC Trainerize x FitMetrics MCP: https://resources.trainerize.com/mcp
- Server URL: https://app.fitmetrics.ai/mcp

Logo is FitMetrics' official mark, the `favicon.svg` from fitmetrics.ai.

## License

MIT

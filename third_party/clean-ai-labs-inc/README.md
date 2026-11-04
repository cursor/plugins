# Clean

Cursor plugin that connects agents to [Clean](https://tryclean.ai) through Clean's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Clean predicts when a company is in a buying window, hands those prospects to its research agent, then organizes lists and drafts sequences.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Clean**.
3. Click **Install**, then complete the Clean sign-in prompt.

Or run `/add-plugin clean-ai-labs-inc` in chat.

## MCP

```json
{
  "mcpServers": {
    "clean-ai-labs-inc": {
      "type": "http",
      "url": "https://app.tryclean.ai/v1/mcp"
    }
  }
}
```

Auth is OAuth, or a Bearer API key created in the Clean app under **Settings → API**. A read-only key refuses write tools.

## Before you connect

You need a Clean account at [app.tryclean.ai](https://app.tryclean.ai).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Research | Start research runs, check run status, fetch the leads a run found, and cancel runs |
| ICPs | List your ideal customer profiles |
| Leads | Read and update saved leads |
| Connections | Look up LinkedIn connections |
| Campaigns | Read and draft outreach sequences |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Sends are confirmed in the Clean app. The MCP server does not send LinkedIn messages without that confirmation.
- Tool calls run under the Clean account and key scope of the user who connects.

## Docs

- Clean: https://tryclean.ai
- Privacy: https://tryclean.ai/privacy
- Server URL: https://app.tryclean.ai/v1/mcp

`logo` points at Clean's submitted logo URL (`https://www.tryclean.ai/clean-logo-blue.png`). tryclean.ai could not be reached when this plugin was added, so no local logo file is committed yet.

## License

MIT

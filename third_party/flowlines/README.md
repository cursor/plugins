# Flowlines

Cursor plugin that connects agents to [Flowlines](https://flowlines.ai/) through Flowlines' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Flowlines helps MCP developers understand how AI agents use their tools. It guides you through adding OpenTelemetry instrumentation to an existing MCP server, then provides session-level analytics, user intent insights, error detection, and recurring use-case analysis. Find where users get stuck, discover unmet needs, and get actionable notifications in Slack.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Flowlines**.
3. Click **Install**, then complete the Flowlines sign-in prompt.

Or run `/add-plugin flowlines` in chat.

## MCP

```json
{
  "mcpServers": {
    "flowlines": {
      "type": "http",
      "url": "https://api.flowlines.ai/mcp"
    }
  }
}
```

Auth is Flowlines OAuth. Cursor prompts for Flowlines sign-in when the plugin connects, then you pick an organization and namespace.

## Before you connect

You need a Flowlines account. To see analytics for your own MCP server, instrument it with OpenTelemetry and send traces to Flowlines.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Instrumentation | Add OpenTelemetry instrumentation to an existing MCP server |
| Analytics | Review MCP usage and session-level analytics |
| Insights | Surface user intents, recurring use cases, and common errors |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Flowlines: https://flowlines.ai/
- Server URL: https://api.flowlines.ai/mcp

Logo is the avatar of the `flowlines-ai` GitHub organization. The submitted icon (https://flowlines.ai/icon-512.png) could not be downloaded when this plugin was added.

## License

MIT

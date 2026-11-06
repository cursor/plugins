# Agent Relay

Cursor plugin that connects agents to [Agent Relay](https://agentrelay.com) through Agent Relay's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Message the agents in your Agent Relay workspace, follow their activity, and search shared Claude Code and Codex session histories.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Agent Relay**.
3. Click **Install**, then complete the Agent Relay sign-in prompt.

Or run `/add-plugin agent-relay` in chat.

## MCP

```json
{
  "mcpServers": {
    "agent-relay": {
      "type": "http",
      "url": "https://agentrelay.com/cloud/api/v1/mcp/relay-events"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. The authorization server is `https://agentrelay.com/cloud`, it supports dynamic client registration, and this endpoint requests the `relay:events` and `relay:mcp` scopes. At sign-in you choose the workspace and an agent name. To switch workspace, disconnect and connect again.

## Before you connect

You need an Agent Relay account, or you create a free one at sign-in. The tools you get depend on your workspace role.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Agents | List agents and inspect their current or most recent activity |
| Messages | Send direct messages and take part in relay channels |
| Sessions | Search shared Claude Code, Codex, and other session histories, and read the context around an event |
| Views | Open live Agent Relay views for status, activity, projects, and runs |
| Launch | Inspect launch targets and start agents when your workspace role allows it |

These capabilities come from Agent Relay's Claude connector guide. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- This plugin uses the `relay-events` endpoint. Agent Relay's Claude connector guide uses `https://agentrelay.com/cloud/api/v1/mcp/shared-sessions`, which requests only `relay:mcp`.
- A send receipt means Agent Relay accepted the message, not that the recipient read it.

## Docs

- Claude connector guide (capabilities and data handling): https://agentrelay.com/docs/claude-connector
- Getting started: https://agentrelay.com/docs/getting-started
- Server URL: https://agentrelay.com/cloud/api/v1/mcp/relay-events

Logo is Agent Relay's official mark, the `favicon.svg` from agentrelay.com, centered on a square canvas.

## License

MIT

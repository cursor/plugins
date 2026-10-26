# Agent Inbox

Cursor plugin that connects agents to [Agent Inbox](https://agentinbox.md) by Novu through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Agent Inbox gives your agent its own name and email address, plus Telegram and Slack if you connect them. People and services can write to it, and your agent can reply, start conversations, and ask people for answers, approvals, or choices, then wait for the reply. Every answer comes back with who replied and when. Messages from people who aren't your contacts are labelled and kept apart.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Agent Inbox**.
3. Click **Install**, then complete the Agent Inbox sign-in prompt.

Or run `/add-plugin novuhq` in chat.

## MCP

```json
{
  "mcpServers": {
    "novuhq": {
      "type": "http",
      "url": "https://mcp.agentinbox.md"
    }
  }
}
```

When the sign-in window opens, create an Agent Inbox account with your email and approve access.

## Getting started

1. Ask your agent: "Set up my Agent Inbox."
2. Choose an agent name and inbox address, then open the confirmation link sent to your email.
3. Email your agent's new address from the email you signed up with.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Agent Inbox: https://agentinbox.md
- Server URL: https://mcp.agentinbox.md

Logo is Novu's GitHub organization avatar. agentinbox.md was unreachable from the build environment when this plugin was added, so the submitted logo (https://agentinbox.md/brand/agentinbox-logo.png) was not downloaded.

## License

MIT

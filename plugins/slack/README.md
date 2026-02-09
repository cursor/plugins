# Slack Plugin

Cursor plugin for Slack — Bolt framework, Block Kit, Events API, and Slack app development.

## Installation

```bash
agent install slack
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `create-slack-bot` | End-to-end bot setup with event listeners, interactive components, and deployment |
| `setup-slash-commands` | Slash command handlers with subcommand routing, modals, and deferred responses |

### MCP Server

Provides Slack API access via `@anthropic/mcp-server-slack`.

Requires `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` environment variables.

## License

MIT

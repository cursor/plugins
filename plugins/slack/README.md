# Slack Plugin for Cursor

A comprehensive Cursor plugin for building Slack apps, bots, and integrations — covering the Bolt framework, Block Kit, Events API, slash commands, interactive components, and modals.

## Overview

This plugin provides rules, agents, skills, hooks, and MCP server configuration to help developers build Slack apps effectively from Cursor.

## Contents

### Rules

| File | Scope | Description |
|------|-------|-------------|
| `rules/slack-bolt.mdc` | `**/*.ts`, `**/*.js` | Best practices for the Bolt framework: ack() handling, event listeners, Socket Mode, OAuth scopes, token security, rate limiting, pagination, modals |
| `rules/slack-block-kit.mdc` | `**/*.ts`, `**/*.js`, `**/*.json` | Best practices for Block Kit: block types, composition objects, interactive components, mrkdwn formatting, block limits, modal submissions |

### Agents

| File | Description |
|------|-------------|
| `agents/slack-app-agent.md` | Specialized agent for designing and building Slack apps — event handling, slash commands, interactive components, modals, Block Kit, and deployment |

### Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `skills/create-slack-bot/SKILL.md` | Creating a new Slack bot | End-to-end guide for building a Bolt bot with event listeners, Block Kit messages, App Home, and deployment options |
| `skills/setup-slash-commands/SKILL.md` | Implementing slash commands | Slash command handlers with argument parsing, subcommand routing, modal triggers, and deferred responses |

### Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `validate-slack-bolt-listeners` | `pre-commit` | Checks that Bolt listeners call ack(), detects hard-coded Slack tokens |
| `validate-block-kit-json` | `pre-commit` | Validates Block Kit JSON syntax and checks the 50-block limit |
| `format-slack-source` | `post-save` | Auto-formats Slack app source files with Prettier on save |

### MCP Server

The `mcp.json` configures the `@anthropic/mcp-server-slack` MCP server, providing AI-accessible Slack API operations:

- Channel listing and history
- Message posting and threading
- Reaction management
- User lookup and profile access
- Message search

### Scripts

| Script | Description |
|--------|-------------|
| `scripts/setup-slack-app.sh` | Environment validator checking Node.js, dependencies, tokens, .env security, and token format |

## Setup

### 1. Install the Plugin

Copy or symlink the `plugins/slack/` directory into your Cursor workspace.

### 2. Configure the MCP Server

Set the required environment variables for the MCP server:

```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_TEAM_ID="T0123456789"
```

### 3. Create a Slack App

If you don't have a Slack app yet, create one at [https://api.slack.com/apps](https://api.slack.com/apps):

1. Click **Create New App** → **From scratch**.
2. Add Bot Token Scopes under **OAuth & Permissions**:
   - `chat:write` — Post messages
   - `app_mentions:read` — Receive @mentions
   - `commands` — Handle slash commands
3. Enable **Socket Mode** and create an App-Level Token with `connections:write`.
4. Enable **Event Subscriptions** and subscribe to `app_mention`.
5. Install the app to your workspace.

### 4. Set Environment Variables

```bash
# .env (for local development)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-1-your-app-level-token
```

### 5. Validate Your Setup

```bash
chmod +x plugins/slack/scripts/setup-slack-app.sh
./plugins/slack/scripts/setup-slack-app.sh
```

## Usage

### With Cursor AI

The plugin activates automatically when you work with relevant files:

- **Writing Bolt app code** — Slack Bolt rules activate when editing `.ts` or `.js` files, providing guidance on ack() handling, event listeners, and token security.
- **Designing Block Kit messages** — Block Kit rules activate for `.ts`, `.js`, and `.json` files, enforcing block limits and formatting best practices.
- **Building a Slack app** — The Slack App Agent provides expert guidance on architecture, interaction patterns, and deployment.
- **Creating a bot** — Use the "Create a Slack Bot" skill for a step-by-step walkthrough.
- **Adding slash commands** — Use the "Set Up Slash Commands" skill for command handlers with subcommand routing.

### Running the Setup Validator

```bash
# Validate the current directory
./plugins/slack/scripts/setup-slack-app.sh

# Validate a specific project
./plugins/slack/scripts/setup-slack-app.sh path/to/slack-app
```

The validator checks:
1. Node.js version (>= 18)
2. npm availability
3. Project structure (package.json, tsconfig.json, src/)
4. Required dependencies (`@slack/bolt`)
5. Environment variables (SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN)
6. .env file security (.gitignore inclusion)
7. Token format validation (xoxb-, xapp- prefixes)
8. App dashboard configuration checklist

## Project Structure

```
plugins/slack/
├── .cursor/
│   └── plugin.json              # Plugin manifest
├── agents/
│   └── slack-app-agent.md       # Slack app development agent
├── rules/
│   ├── slack-bolt.mdc           # Bolt framework best practices
│   └── slack-block-kit.mdc      # Block Kit best practices
├── skills/
│   ├── create-slack-bot/
│   │   └── SKILL.md             # Bot creation guide
│   └── setup-slash-commands/
│       └── SKILL.md             # Slash command setup guide
├── hooks/
│   └── hooks.json               # Pre-commit and post-save hooks
├── scripts/
│   └── setup-slack-app.sh       # Environment validation script
├── extensions/                   # Extension point (reserved)
├── mcp.json                     # MCP server configuration
├── README.md                    # This file
├── CHANGELOG.md                 # Version history
└── LICENSE                      # MIT License
```

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and add tests where applicable.
4. Submit a pull request with a clear description.

## License

MIT License — see [LICENSE](LICENSE) for details.

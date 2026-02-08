# Changelog

All notable changes to the Slack plugin for Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added

- **Plugin manifest** (`.cursor/plugin.json`) — Metadata, entry points, and configuration for the Slack plugin.
- **Rules**
  - `rules/slack-bolt.mdc` — Best practices for the Bolt framework: using the Bolt SDK over raw API calls, immediate ack() acknowledgment, Block Kit for rich messages, request signature validation, rate-limit retry handling, Socket Mode for development, minimal OAuth scopes, secure token storage, app_mention vs message events, modals for complex interactions, and API response pagination.
  - `rules/slack-block-kit.mdc` — Best practices for Block Kit: using Block Kit Builder for design, concise message layout, proper block types (header, section, divider, actions, context, image, input, rich_text), interactive component handling with unique action_ids, composition objects (plain_text vs mrkdwn), block limit validation (50 blocks per message), mrkdwn formatting syntax, and modal submission handling with validation and view updates.
- **Agents**
  - `agents/slack-app-agent.md` — Specialized agent for Slack app development: app architecture design, Bolt framework code generation, Block Kit message and modal creation, event and webhook handling, slash command implementation, and debugging common Slack API errors.
- **Skills**
  - `skills/create-slack-bot/SKILL.md` — Step-by-step guide for creating a Slack bot with the Bolt framework, including Slack App dashboard setup, project scaffolding, event listeners (app_mention, message, reaction_added, app_home_opened), interactive buttons, App Home tab, and deployment options (Railway/Render, AWS Lambda).
  - `skills/setup-slash-commands/SKILL.md` — Guide for implementing slash commands with argument parsing, subcommand routing, modal triggers for data entry, deferred responses for long operations, modal submission handling with input validation, and project structure patterns.
- **Hooks** (`hooks/hooks.json`)
  - Pre-commit hook to validate Bolt listeners call ack() and detect hard-coded Slack tokens.
  - Pre-commit hook to validate Block Kit JSON syntax and check the 50-block limit.
  - Post-save hook to auto-format Slack app source files with Prettier.
- **MCP server** (`mcp.json`) — Configuration for `@anthropic/mcp-server-slack` providing AI-accessible Slack API operations: channel listing, message posting, threading, reactions, user profiles, and message search.
- **Scripts**
  - `scripts/setup-slack-app.sh` — Environment validation script checking Node.js version, npm availability, project structure, @slack/bolt dependency, environment variables, .env security, token format, and app dashboard configuration.
- **Documentation**
  - `README.md` — Plugin overview, setup guide, usage instructions, and project structure.
  - `CHANGELOG.md` — This changelog.
  - `LICENSE` — MIT License.

[1.0.0]: https://github.com/cursor/service-plugin-generation/releases/tag/slack-plugin-v1.0.0

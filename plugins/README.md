# Cursor Plugins

This directory contains plugins for Cursor. Each plugin provides skills and an MCP server integration.

## Plugin Structure

```
plugin-name/
├── .cursor/
│   └── plugin.json        # Plugin manifest (required)
├── skills/                # Agent skills (directories with SKILL.md)
├── mcp.json               # MCP server definitions
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Available Plugins

| Plugin | Category | Description |
|:-------|:---------|:------------|
| `github` | Developer Tools | Actions, API, CLI, Pull Requests, and repository management |
| `sentry` | Observability | Error monitoring, performance tracking, and alerting |
| `docker` | Developer Tools | Dockerfiles, Compose, multi-stage builds, and containers |
| `firebase` | Backend | Firestore, Cloud Functions, Authentication, and Hosting |
| `twilio` | SaaS | SMS, Voice, WhatsApp, Verify, and communications APIs |
| `slack` | SaaS | Bolt framework, Block Kit, Events API, and app development |
| `launchdarkly` | Developer Tools | Feature flags, experimentation, and progressive rollouts |
| `mongodb` | Backend | Schema design, queries, aggregation, indexes, and Mongoose |

## Installation

```bash
agent install <plugin-name>
```

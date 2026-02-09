# Sentry Plugin

Cursor plugin for Sentry — error monitoring, performance tracking, session replay, and alerting.

## Installation

```bash
agent install sentry
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `setup-sentry` | Framework-specific setup for Next.js, React, Node.js, and Python with source maps and releases |
| `configure-alerts` | Issue alerts, metric alerts, uptime monitors, and cron monitors |

### MCP Server

Provides access to Sentry via `@sentry/mcp-server`.

Requires `SENTRY_AUTH_TOKEN` environment variable.

## License

MIT

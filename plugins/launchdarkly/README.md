# LaunchDarkly Plugin

Cursor plugin for LaunchDarkly — feature flags, experimentation, progressive rollouts, and targeting.

## Installation

```bash
agent install launchdarkly
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `setup-launchdarkly` | SDK integration, client initialization, context setup, React provider, and testing |
| `create-feature-flag` | Flag lifecycle from creation through rollout, experimentation, and cleanup |

### MCP Server

Provides LaunchDarkly flag management via `@launchdarkly/mcp-server`.

Requires `LAUNCHDARKLY_ACCESS_TOKEN` environment variable.

## License

MIT

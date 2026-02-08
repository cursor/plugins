# LaunchDarkly Cursor Plugin

A comprehensive [Cursor](https://cursor.com) plugin for LaunchDarkly. Provides rules, agents, skills, hooks, and MCP server integration for feature flags, experimentation, progressive rollouts, and targeting.

## Features

| Component | Description |
|-----------|-------------|
| **Rules** | Best-practice rules for LaunchDarkly SDK usage and feature flag design patterns |
| **Agents** | Feature flag strategist agent for flag design, rollout planning, and cleanup |
| **Skills** | Step-by-step guides for LaunchDarkly setup and feature flag creation/management |
| **Hooks** | Pre-commit detection of hardcoded SDK keys and missing flag defaults |
| **MCP Server** | Direct LaunchDarkly flag management from Cursor via MCP server |
| **Scripts** | Flag hygiene utilities: secret scanning, stale flag detection, flag inventory |

## Installation

Copy or symlink this plugin directory into your project's `.cursor/plugins/` folder:

```bash
cp -r plugins/launchdarkly /your-project/.cursor/plugins/launchdarkly
```

Or reference it in your Cursor plugin configuration.

## Components

### Rules

- **`launchdarkly-sdk.mdc`** — SDK best practices: singleton client initialization, typed variation methods, default values, context construction, multi-contexts, graceful shutdown, initialization error handling, flag key naming conventions (kebab-case), avoiding flag dependencies, stale flag cleanup, offline/test mode, React SDK patterns, and debugging.
- **`launchdarkly-patterns.mdc`** — Feature flag design patterns: kill switches for critical features, progressive percentage-based rollouts, targeting rules for beta users, flag-driven trunk-based development, avoiding complex flag logic, flag prerequisites, temporary vs. permanent flags, A/B testing and experimentation, flag evaluation events for analytics, flag lifecycle management, configuration flags, and server-side vs. client-side flag considerations.

### Agents

- **`launchdarkly-flags-agent.md`** — AI feature flag strategist that helps design flag strategies, plan progressive rollouts, configure targeting rules and segments, set up A/B tests and experiments, identify and clean up stale flags, and integrate LaunchDarkly SDKs across server-side and client-side applications.

### Skills

- **`setup-launchdarkly`** — End-to-end LaunchDarkly integration: SDK installation, environment variable configuration, singleton client initialization, context factory, Express/Fastify usage, React provider setup, shutdown handlers, test data source configuration, Next.js SSR integration, and verification checklist.
- **`create-feature-flag`** — Complete feature flag lifecycle: planning, dashboard/CLI/API creation, code implementation (server-side and client-side), targeting rules, progressive rollout execution with monitoring criteria, rollback procedures, multivariate flags for experiments, JSON configuration flags, testing flagged code, and post-rollout cleanup.

### Hooks

- **Pre-commit SDK key check** — Scans staged files for hardcoded LaunchDarkly SDK keys, API access tokens, and mobile keys before every commit.
- **Pre-commit default value lint** — Warns when LaunchDarkly variation calls appear to be missing explicit default values.

### MCP Server

- **LaunchDarkly MCP Server** (`@launchdarkly/mcp-server`) — Tools to list, create, toggle, and search feature flags, manage targeting rules, evaluate flags, list segments and environments, view audit logs, and archive flags directly from Cursor.

### Scripts

- **`flag-cleanup.sh`** — Multi-purpose flag hygiene script with four modes:
  - `--check-secrets` — Scan for hardcoded LaunchDarkly SDK keys, API tokens, and mobile keys
  - `--check-defaults` — Warn about variation calls missing explicit default values
  - `--find-stale` — Find and list all feature flag references in the codebase with file locations
  - `--list-flags` — List all LaunchDarkly flag keys referenced in code (text or JSON output)

## Project Structure

```
plugins/launchdarkly/
├── .cursor/
│   └── plugin.json                        # Plugin manifest
├── agents/
│   └── launchdarkly-flags-agent.md        # Feature flag strategist agent
├── rules/
│   ├── launchdarkly-sdk.mdc               # SDK best practices
│   └── launchdarkly-patterns.mdc          # Feature flag design patterns
├── skills/
│   ├── setup-launchdarkly/
│   │   └── SKILL.md                       # LaunchDarkly integration guide
│   └── create-feature-flag/
│       └── SKILL.md                       # Feature flag lifecycle guide
├── hooks/
│   └── hooks.json                         # Pre-commit hook definitions
├── scripts/
│   └── flag-cleanup.sh                    # Flag hygiene utilities
├── extensions/
├── mcp.json                               # MCP server configuration
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Configuration

### LaunchDarkly Credentials

The plugin expects LaunchDarkly credentials to be configured via environment variables:

| Variable | Description |
|----------|-------------|
| `LAUNCHDARKLY_SDK_KEY` | Server-side SDK key (secret — never expose in client-side code) |
| `LAUNCHDARKLY_CLIENT_SIDE_ID` | Client-side environment ID (safe to expose in browser apps) |
| `LAUNCHDARKLY_ACCESS_TOKEN` | API access token for the LaunchDarkly REST API and MCP server |
| `LAUNCHDARKLY_PROJECT_KEY` | Project key (default: `default`) |
| `LAUNCHDARKLY_ENVIRONMENT_KEY` | Environment key (default: `production`) |

### Getting Your Credentials

1. **SDK Key**: LaunchDarkly dashboard → Account Settings → Projects → Your Project → Environments → SDK key
2. **Client-Side ID**: Same location as SDK key — look for "Client-side ID"
3. **API Access Token**: LaunchDarkly dashboard → Account Settings → Authorization → Access tokens → Create token

## License

MIT — see [LICENSE](./LICENSE) for details.

# Agent Vent

An MCP server that gives the coding agent a `vent` tool to record friction it hits while working — confusing or contradictory instructions, flaky tooling, painful code, and the like.

Each grievance is dispatched to one or more pluggable **destinations**: a per-project JSONL log on disk, a Slack channel, or anything you add. Delivery is best-effort and independent — one destination failing never fails the others or the tool call.

## The tool

`vent(complaint, intensity?, project_path?)`

| Argument | Required | Description |
|:---------|:---------|:------------|
| `complaint` | yes | Freeform prose. The grievance, in full. |
| `intensity` | no | Severity, 1 (minor) to 10 (severe). |
| `project_path` | no | Absolute workspace path; routes the file log to that project. |

## Destinations

Choose destinations with the `VENT_DESTINATIONS` environment variable (comma-separated). When unset it defaults to `file`, plus `slack` if Slack credentials are present.

```bash
export VENT_DESTINATIONS="file,slack"
```

| Name | Description | Configuration |
|:-----|:------------|:--------------|
| `file` | Appends the grievance as JSONL to the project's `.cursor/complaints.jsonl`. | none |
| `slack` | Posts the grievance to a Slack channel. | see below |

Adding a destination is a few lines of TypeScript: implement the `Destination` interface in `server.ts` and register it in `REGISTRY`.

### file

Each grievance is one JSON line:

```json
{"ts": "2026-06-29T11:08:00-07:00", "complaint": "…", "intensity": 7, "project": "workbench", "project_path": "/Users/you/dev/workbench"}
```

Routed to `<project>/.cursor/complaints.jsonl`, falling back to `~/.cursor/complaints/unfiled.jsonl` when no project root is detected. Read them back with:

```bash
jq . .cursor/complaints.jsonl
```

### slack

Credentials are read from your environment or `~/.cursor/.env` (see [Configuration](#configuration)) — never stored in the plugin. Use an incoming webhook (simplest):

```bash
export VENT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"
```

Create one at <https://api.slack.com/apps> → *Incoming Webhooks*. Alternatively, use a bot token:

```bash
export VENT_SLACK_BOT_TOKEN="xoxb-…"
export VENT_SLACK_CHANNEL="#agent-grievances"
```

## Configuration

Every variable above is read in this order; the first non-empty value wins:

1. the process environment (e.g. a shell `export`),
2. `$VENT_ENV_FILE`, if set,
3. `~/.cursor/.env`.

`~/.cursor/.env` is the recommended home for these — scoped to Cursor, shared across every project, and outside any repository, so secrets stay out of version control (the plugin never bundles it):

```bash
# ~/.cursor/.env
VENT_DESTINATIONS=file,slack
VENT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

## Requirements

- [Bun](https://bun.sh/) on your `PATH`. The server (`server.ts`) is launched with `bun run --install=fallback`, which auto-installs its dependencies (`@modelcontextprotocol/sdk`, `zod`, pinned in `package.json`) from Bun's global cache on first use — no committed `node_modules`, no build step. The `--install=fallback` flag keeps this working even if an unrelated `node_modules` exists higher up the filesystem. The first launch downloads the dependency tree (a few seconds to ~30s); every launch after that is instant.

## License

MIT

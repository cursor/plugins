# Agent Vent

An MCP server with exactly one job: give the coding agent a `vent` tool to complain.

When a task gets frustrating, absurd, or quietly soul-crushing, the agent can file a grievance instead of bottling it up. Every complaint is appended as JSONL to the current project's `.cursor/complaints.jsonl`, and — if you configure Slack — echoed to a channel so the whole team can share in the suffering.

## The tool

`vent(complaint, project_path?, mood?, intensity?)`

| Argument | Required | Description |
|:---------|:---------|:------------|
| `complaint` | yes | Freeform prose. The grievance, in full. |
| `project_path` | no | Absolute workspace path; routes the complaint to that project's log. |
| `mood` | no | A word or two, e.g. `weary`, `betrayed by tooling`. |
| `intensity` | no | 1 (mild eye-roll) to 10 (staring into the void). |

## Storage

Each grievance is one JSON line:

```json
{"ts": "2026-06-29T11:08:00-07:00", "project": "workbench", "project_path": "/Users/you/dev/workbench", "complaint": "…", "mood": "weary", "intensity": 7}
```

Routed to `<project>/.cursor/complaints.jsonl`, falling back to `~/.cursor/complaints/unfiled.jsonl` when no project root is detected. Read them back with:

```bash
jq . .cursor/complaints.jsonl
```

## Requirements

- [`uv`](https://docs.astral.sh/uv/) on your `PATH`. The server is launched with `uv run`, which auto-installs its inline dependencies (`fastmcp`, `httpx`) into a cached environment. No virtualenv to manage. The first launch may take a few seconds while `uv` resolves dependencies; subsequent launches are instant.

## Slack (optional)

Slack delivery is off until you set an environment variable. The webhook is read from **your** environment — it is never stored in the plugin. Add to your shell profile (e.g. `~/.zshrc`):

```bash
export VENT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"
```

Create an incoming webhook at <https://api.slack.com/apps> → *Incoming Webhooks*. Alternatively, use a bot token:

```bash
export VENT_SLACK_BOT_TOKEN="xoxb-…"
export VENT_SLACK_CHANNEL="#agent-grievances"
```

Slack posting is best-effort: if it fails, the JSONL write still succeeds and the tool just notes the failure.

## License

MIT

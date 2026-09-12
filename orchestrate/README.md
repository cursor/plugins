# Orchestrate

Fan a large task out across parallel Cursor cloud agents via the Cursor SDK. Planners publish tasks, workers hand off back up, and a script reconciles the tree from disk and git, so the spawn / wait / handoff loop keeps converging without long-running agent state.

The skill itself lives in [`skills/orchestrate/SKILL.md`](./skills/orchestrate/SKILL.md). Read that for the full operating manual; this README only covers what to set up before you invoke it.

## Prerequisites

- `bun` on PATH.
- A Cursor API key in `CURSOR_API_KEY`.
- Optional Slack app and bot token if you want a Slack thread mirroring the run.

## Model catalog (optional)

`ORCHESTRATE_MODEL_CATALOG` replaces the built-in model catalog with your own. When it is set, that list is the complete menu: it is what planners choose `tasks[].model` from, what `bun cli.ts models` prints, and where each task type's default comes from. Nothing is merged with the built-in catalog, so what you write is exactly what runs. Use it to steer cost without editing the plugin.

The value is a JSON array in the same shape as the built-in catalog, validated against [`skills/orchestrate/schemas/model-catalog.schema.json`](./skills/orchestrate/schemas/model-catalog.schema.json). Start from the built-in list rather than writing entries by hand:

```bash
bun skills/orchestrate/scripts/cli.ts models --json > catalog.json
# edit catalog.json: drop what you don't want, move defaultFor where you want it
export ORCHESTRATE_MODEL_CATALOG="$(cat catalog.json)"
```

Every entry needs `slug`, `selection`, `summary`, `strengths`, `speed`, and `use`. `defaultFor` and `selection.params` are optional:

```json
[
  {
    "slug": "house-worker",
    "selection": { "id": "composer-2.5", "params": [{ "id": "fast", "value": "true" }] },
    "summary": "Cheap, fast worker.",
    "strengths": ["throughput", "well-scoped implementation"],
    "speed": "fast",
    "use": "Use for all bounded implementation work.",
    "defaultFor": ["worker"]
  },
  {
    "slug": "house-planner",
    "selection": { "id": "claude-opus-4-8" },
    "summary": "Frontier judgment for decomposition and acceptance checks.",
    "strengths": ["judgment", "ambiguity resolution"],
    "speed": "slow",
    "use": "Use when the work needs design decisions rather than execution.",
    "defaultFor": ["subplanner", "verifier"]
  }
]
```

`summary`, `strengths`, and `use` are required because planners select by capability, not by model name. An entry with thin prose tends to get passed over. `speed` is a free-form string, so new model vocabulary doesn't need a plugin release.

Each of `worker`, `subplanner`, and `verifier` needs a `defaultFor` somewhere in the list. Root planners are not part of the catalog; they take their model from kickoff `--model`, which defaults to `claude-opus-4-8`.

### Precedence

1. Explicit `tasks[].model` in the plan
2. The `defaultFor` entry for that task's type

Run `bun cli.ts models` to print the catalog in effect, and `bun cli.ts models --check` to probe every entry against `/v1/agents`. Invalid config exits 2 at startup, naming the offending entry and field, rather than failing mid-run:

```
ORCHESTRATE_MODEL_CATALOG failed zod validation:
  [0].summary: Required
```

Two caveats. This shapes what planners choose from, but a planner can still write any model id into `tasks[].model`, so it is guidance rather than a spend ceiling. And each spawned agent reads its own environment: set the variable as a Cursor Cloud secret for the repo so subplanners and workers inherit it, not just in the dispatcher's local shell.

## Cursor API key

1. Open [https://cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations).
2. Create a personal user API key. The value starts with `cursor_`.
3. Export it: `export CURSOR_API_KEY="cursor_..."`.

Team service-account keys (Team Settings → Service accounts) also work for both local and cloud runs. See the [`cursor-sdk` plugin](https://github.com/cursor/plugins/tree/main/cursor-sdk) for the full auth model.

## Slack app (optional)

Slack visibility is opt-in. When the token is unset, the script logs once and runs without Slack; correctness does not change. To enable it:

> **Renamed:** these were `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`. They are now `ORCHESTRATE_SLACK_BOT_TOKEN` and `ORCHESTRATE_SLACK_CHANNEL_ID` so orchestrate can't pick up another tool's Slack app from a shared environment. The unprefixed names are no longer read; if only the old token is set, the CLI says so instead of going quiet.

1. Create a Slack app at [https://api.slack.com/apps](https://api.slack.com/apps) → **From scratch**. Pick a name and a workspace.
2. Under **OAuth & Permissions** → **Bot Token Scopes**, add:

   | Scope | Why |
   | --- | --- |
   | `chat:write` | Post and edit messages. |
   | `chat:write.customize` | Set the bot username and icon on each post. |
   | `chat:write.public` | Post in public channels without inviting the bot first. |
   | `files:write` | Upload handoff artifacts to the run thread. |
   | `files:read` | Paired with `files:write` for the upload v2 flow. |
   | `reactions:read` | Watch the Andon `:rotating_light:` reaction on the kickoff message. |
   | `channels:history` | Read thread replies. Use `groups:history` instead if your run channel is private. |

   Optional but recommended:

   | Scope | Why |
   | --- | --- |
   | `users:read.email` | Resolve the dispatcher's first name from `git config user.email`. Without it, pass `--dispatcher-name` explicitly. |

3. **Install to Workspace** and copy the **Bot User OAuth Token** (`xoxb-...`).
4. Export it: `export ORCHESTRATE_SLACK_BOT_TOKEN="xoxb-..."`.
5. Invite the bot to the channel where you want runs to thread (`/invite @your-bot`). Public channels with `chat:write.public` skip this; private channels require the invite.
6. Grab the channel ID. In Slack: right-click the channel → **View channel details** → bottom of the dialog. Pass it via `--slack-channel <id>` on `kickoff` (or set `ORCHESTRATE_SLACK_CHANNEL_ID`). The first kickoff persists the id on the plan; subplanners and later `run` invocations inherit it.

## Install

```bash
cd skills/orchestrate/scripts
bun install
```

The scripts live outside the host repo's package manager workspace on purpose.

## Invoke

```bash
bun skills/orchestrate/scripts/cli.ts kickoff "<goal>" \
  [--repo <url>] [--ref main] [--model claude-opus-4-7] \
  [--slack-channel <id>] [--dispatcher-name "<first name>"]
```

The CLI prints `{ agentId, runId, status, url }`; from there the cloud root planner self-drives. See the skill for `run`, `spawn`, `respawn`, `kill`, `tail`, `comment`, and `andon` subcommands.

## License

MIT. See [`LICENSE`](./LICENSE).

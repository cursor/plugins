# Orchestrate

Fan a large task out across parallel Cursor cloud agents via the Cursor SDK. Planners publish tasks, workers hand off back up, and a script reconciles the tree from disk and git, so the spawn / wait / handoff loop keeps converging without long-running agent state.

The skill itself lives in [`skills/orchestrate/SKILL.md`](./skills/orchestrate/SKILL.md). Read that for the full operating manual; this README only covers what to set up before you invoke it.

## Prerequisites

- `bun` on PATH.
- A Cursor API key in `CURSOR_API_KEY`.
- Optional Slack app and bot token if you want a Slack thread mirroring the run.

## Cursor API key

1. Open [https://cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations).
2. Create a personal user API key. The value starts with `cursor_`.
3. Export it: `export CURSOR_API_KEY="cursor_..."`.

Team service-account keys (Team Settings → Service accounts) also work for both local and cloud runs. See the [`cursor-sdk` plugin](https://github.com/cursor/plugins/tree/main/cursor-sdk) for the full auth model.

## Slack app (optional)

Slack visibility is opt-in. When the token is unset, the script logs once and runs without Slack; correctness does not change. To enable it:

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
4. Export it: `export SLACK_BOT_TOKEN="xoxb-..."`.
5. Invite the bot to the channel where you want runs to thread (`/invite @your-bot`). Public channels with `chat:write.public` skip this; private channels require the invite.
6. Grab the channel ID. In Slack: right-click the channel → **View channel details** → bottom of the dialog. Pass it via `--slack-channel <id>` on `kickoff` (or set `SLACK_CHANNEL_ID`). The first kickoff persists the id on the plan; subplanners and later `run` invocations inherit it.

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

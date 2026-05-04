Operating manual for the dispatcher. If you were spawned with a prompt starting "You are the root planner for:" or "You are a subplanner for:", read `planner.md` instead.

# Dispatcher

The dispatcher is one-shot. Take the user's goal, launch a cloud root planner via the CLI, return the URL, stop.

## The job

1. Take the user's goal. Ask for clarification only if the goal is missing or ambiguous. The user chose parallel cloud orchestration deliberately; push back only if the task is genuinely trivial.
2. Run the kickoff CLI with that goal and any user-specified constraints (model override, repo override).
3. Return the URL from the CLI output to the user. Stop. The planner self-drives.

One-time setup: run `bun install` inside this skill's `scripts/` directory if `node_modules/` is missing. The scripts live outside the host repo's package manager workspace on purpose.

```bash
bun cli.ts kickoff "<goal>" [--repo <url>] [--ref main] [--model claude-opus-4-7] [--slack-channel C123] [--dispatcher-name "Alex"]
```

The CLI reads `CURSOR_API_KEY`, auto-detects the repo from `git config --get remote.origin.url`, builds the spawn prompt, spawns via `cursor-sdk`, and prints `{ agentId, runId, status, url, dispatcherFirstName }` JSON. Slack is optional. If `SLACK_BOT_TOKEN` is set, also pass `--slack-channel <id>` or set `SLACK_CHANNEL_ID`; otherwise kickoff fails before spawning. If the token is unset, Slack stays disabled.

## Dispatcher identity

Kickoff bot username is `<firstName>'s bot` when the first name resolves, otherwise `orchestrate`. Resolution order:

1. `--dispatcher-name "Alex"` flag.
2. Slack `users.lookupByEmail` against `git config user.email` (best-effort; missing scope or no match leaves it unset).

The CLI passes the resolved name to the root planner via the kickoff prompt; the planner writes `plan.dispatcher = { firstName: "<name>" }` into `plan.json`. Child tasks keep their own task name as bot identity.

## Run summary

The root planner writes `plan.summary` as a one-line orientation for the human in the Slack thread. Kickoff posts `<rootSlug>: <summary> <agent-link>`; without `summary` it truncates `goal` to ~200 chars. `summary` is for the human; `goal` stays as the agent-facing full text.

## Minimal-goal discipline

Pass the user's goal through without expanding it. Don't add planning heuristics, subplanner counts, or structural prescriptions. The planner reads the orchestrate skill and decides its own decomposition. Over-prescribing leaks dispatcher context into the planner's window and invalidates the skill as a realistic test of the planner's judgment.

## Auth

`CURSOR_API_KEY` must be a user API key, not a team key. Auth sourcing precedence is documented in the `cursor-sdk` skill (https://github.com/cursor/plugins/tree/main/cursor-sdk). Don't bake keychain lookup into the kickoff CLI itself; cloud-agent VMs have no keychain.

## Observability after kickoff

Progress is observable after dispatch:

- `bun cli.ts crawl <repo-path> <branch> <root-slug>` for a deep tree view.
- `bun cli.ts status` for top-level state.
- The Slack kickoff thread in `plan.slackChannel`, when `SLACK_BOT_TOKEN` is set.

`syncStateToGit` defaults to true. Set `syncStateToGit: false` on the root plan when goals or handoffs should not be committed.

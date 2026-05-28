# Automation: weekly-get-better

> Run `/gtm-get-better` every Monday morning so your sales pack and per-channel playbooks compound week over week.

## Spec

| Field | Value |
|---|---|
| **Name** | weekly-get-better |
| **Description** | Run the founder-gtm `/gtm-get-better` skill weekly. Reads outreach logs across X DMs, LinkedIn, and cold email. Classifies first replies. Updates `sales-pack.md` and `outreach-log/learned-*.md` with what landed and what didn't. |
| **Trigger** | Cron: `0 9 * * 1` (Mondays 9am, your local time) |
| **Tools** | None required. The skill reads local files (`outreach-log/*.jsonl`, `sales-pack.md`, `plays/*.md`) and writes back to the same. |
| **Optional tools** | `slack` — if you want a weekly summary posted to a channel or DM after the run. |
| **Prompt** | Run the `/gtm-get-better` skill with a 7-day lookback window. After it completes, post a 3-bullet summary of the top actions to {{slack channel or DM}} so I see it in the morning. If there's nothing new since last week's run, say so and stop. |

## To finish in the Automations editor

- **Schedule timezone.** Confirm the 9am time matches your local timezone in the editor preview.
- **Slack channel** (optional). If you enabled the `slack` tool, pick the channel or DM destination. Use your own DM with yourself if you don't want noise in a public channel.
- **Cloud compute.** Confirm your Cloud Agent plan; weekly runs are cheap (one short context window).

## When to disable

- You've stopped running outbound for now.
- You're in a deep build sprint and don't want the noise.
- The plugin has produced 3+ consecutive empty `/gtm-get-better` runs (means you're not generating new data fast enough — go run a campaign first).

## When to upgrade

- After 4 weeks of data, change the lookback to "since last run" so cycles compound on the prior week's findings.
- After 8 weeks, add `slackTrigger` + `mcp` so you can ask follow-up questions about the weekly summary in Slack and have the agent dig into specifics.

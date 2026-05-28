# Automation: post-campaign-debrief

> The day after a campaign goes out, ingest replies and tell the founder what's already working.

## Spec

| Field | Value |
|---|---|
| **Name** | post-campaign-debrief |
| **Description** | Triggered the morning after a campaign send. Pulls Gmail replies via the cold-email skill's reply-check path, classifies them, and posts a quick read on the first 24 hours of response. Useful for spotting whether the subject line is dead before more of the sequence fires. |
| **Trigger** | Cron: `0 8 * * *` (every day 8am local) OR Slack message trigger: a keyword like "debrief" in a chosen channel. |
| **Tools** | `slack` (for the summary post). Optional `readSlack` if you want the agent to first check whether a debrief was already run today. |
| **Prompt** | Check `outreach-log/email.jsonl` in the project root for any campaigns whose Touch 1 was sent in the last 24 hours. If none, stop silently. If one or more, run `/gtm-cold-email --check-replies` to ingest new replies, then `/gtm-get-better` with a 24-hour lookback scoped to those campaigns. Post the result to {{slack channel or DM}} as a short read: campaign name, Touch 1 sends, replies so far, classification breakdown, the one thing to watch for. |

## To finish in the Automations editor

- **Trigger choice.** Pick one:
  - **Cron 8am daily** — passive, won't fire if there's no recent campaign.
  - **Slack message trigger** — you type "debrief" in a channel and it runs. Slower to set up; better for ad-hoc debriefs.
- **Slack channel** (required, for the summary post). Use a DM with yourself unless you want the team to see it.
- **Cloud compute.** Slightly more expensive than the other two automations because of the reply-classification LLM calls; budget ~2 minutes of compute per run.

## What "what to watch for" usually says

Based on the patterns the internal Cursor growth team sees:

- "Subject is dead — no opens after 18 hours" → swap subjects before Touch 2 fires.
- "All replies are objections, no positives" → the wedge in your sales-pack needs sharpening for this signal.
- "All replies are positive but no meetings booked" → your CTA is too soft; tighten it for the next campaign.
- "Above target on positives at low N" → run another batch of the same play with 3x volume.

## When to disable

- You haven't run a campaign in two weeks (no signal, no debrief value).
- Your Slack notifications are out of control and you'd rather see this in the weekly `/gtm-get-better` summary instead.

## Pairing

This automation pairs naturally with `weekly-get-better`. Daily debriefs catch surprises early; the weekly run aggregates them into durable updates to `sales-pack.md`.

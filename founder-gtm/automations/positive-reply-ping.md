# Automation: positive-reply-ping (optional)

> When a prospect replies positively, ping the founder. Suppress everything else.

## Spec

| Field | Value |
|---|---|
| **Name** | positive-reply-ping |
| **Description** | Polls Gmail for replies to outbound threads, classifies them, and notifies only when a reply was classified positive. Cuts through the OOO + neutral noise that makes founders ignore reply notifications. |
| **Trigger** | Cron: `0 9 * * 1-5` (weekdays 9am local) |
| **Tools** | `slack` (notification destination) |
| **Prompt** | Run `/gtm-cold-email --check-replies` for the last 24 hours. If any reply was classified as positive, post one message per positive reply to {{slack channel or DM}} with: prospect name and company, the first 2 sentences of their reply, a direct link to the Gmail thread, and the campaign the prospect came from. Suppress neutral, objection, and OOO replies. If none, stay silent. |

## To finish in the Automations editor

- **Schedule timezone.** 9am local catches the previous evening's replies and the morning's.
- **Slack channel** (required). Your DM with yourself unless your team is on this with you.
- **Cloud compute.** Cheap when there's no signal; otherwise scales with reply volume.

## Why "positive only"

The internal Cursor growth team finds that:

- ~50% of replies are OOO (no action needed)
- ~10–20% are objection (worth reviewing in batch, not one at a time)
- ~5–10% are negative (no action needed)
- ~20–30% are positive (action needed today)

If every reply pinged you, you'd mute the channel within a week. Pinging only on positives keeps the signal-to-noise high enough that you actually act.

## Pairing

Don't run this without also running `weekly-get-better`. The weekly run still surfaces objection trends and OOO rates so you don't lose them; this just keeps the daily attention high-signal.

# Automation: daily-followups

> Advance the cold-email sequence one step every weekday morning, under the daily cap.

## Spec

| Field | Value |
|---|---|
| **Name** | daily-followups |
| **Description** | Every weekday at 7am, run `/gtm-cold-email --followups` so Touch 2 / 3 / 4 messages go out on cadence. Honors the daily send cap from `${CURSOR_PLUGIN_ROOT}/.env` and the per-thread reply state so anyone who already replied gets dropped from the queue. |
| **Trigger** | Cron: `0 7 * * 1-5` (weekdays 7am local) |
| **Tools** | None required. Cold-email uses the Gmail OAuth token stored at `${CURSOR_PLUGIN_ROOT}/.gtm-state/gmail-token.json`. |
| **Optional tools** | `slack` — to ping you if the daily cap was hit or if any send failed (e.g. bounce). |
| **Prompt** | Run `/gtm-cold-email --followups`. Send all queued Touch 2 / 3 / 4 messages whose scheduled date is today or earlier, up to the configured daily cap. Stop early if you hit the cap. After the run, report the count of sent, the count of skipped-due-to-reply, the count of skipped-due-to-cap, and any errors. If anything errored, post a one-line summary to {{slack channel or DM}}. |

## To finish in the Automations editor

- **Schedule timezone.** Confirm 7am matches your local timezone. Earlier is better for B2B (catches the prospect at the top of their inbox).
- **Slack channel** (optional, error-only). Pick a DM with yourself so cap-hit and bounce notifications are visible without spamming a team channel.
- **Cloud compute.** Daily runs are cheap; the agent only acts when there's a queued follow-up.

## Safeguards

The skill itself enforces:

- Hard daily cap (default 25; configurable in `${CURSOR_PLUGIN_ROOT}/.env`).
- Reply check via Gmail API before sending each follow-up. If the recipient replied, the rest of the sequence is canceled for that thread automatically.
- Plain-text only, no tracking pixels.
- Random spacing between sends (60–300 seconds default).

## When to disable

- You're on vacation and don't want auto-replies firing to people who reply.
- You've paused all cold-email campaigns.
- Your sending domain reputation just took a hit (warm again before resuming).

## Variants

If you want Touch 1 sends to be drafts-only and only Touch 2–4 to send automatically, change the prompt to `Run /gtm-cold-email --followups --touches 2,3,4`. New campaigns will land in your Drafts folder for manual review; the automation handles the follow-up cadence once you click send on Touch 1.

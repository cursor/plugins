# Automations

Three Cursor Automation workflows ship with this plugin. They're optional — the skills work fine without them — but if you want the system to actually compound without you having to remember to run things, install these.

| File | What it does | Schedule |
|---|---|---|
| `weekly-get-better.workflow.json` | Runs `/gtm-get-better` on Mondays at 7am PT | weekly |
| `daily-followups.workflow.json` | Runs cold-email reply check + advances follow-up queue every weekday at 9am PT | daily, M–F |
| `post-campaign-debrief.workflow.json` | Manual trigger; campaign-scoped debrief | on-demand |

## How to install

### Path 1: ask the agent (recommended)

Open a chat in Cursor and say:

> Install the founder-gtm automations from the installed Founder GTM plugin's `automations/` folder.

The agent reads each `.workflow.json`, opens the Cursor Automations UI via the `cursor-app-control` MCP's `open_automation` tool, prefills the form from the JSON, and you click save. Repeat for each file.

### Path 2: manual

1. Open Cursor → Automations.
2. Click "New automation".
3. Copy the contents of the `.workflow.json` file you want to install.
4. Paste / fill in the fields:
   - Name + description from the JSON
   - Trigger (cron string + timezone)
   - Workflow step type: `agent`
   - Workspace root: your project root, where `sales-pack.md` and `outreach-log/` live.
   - Agent prompt: paste the `workflow.steps[0].prompt` string verbatim
5. Save.

## What you should expect

- **Weekly get-better** will email or Slack you a short summary on Mondays (depending on your Automation notification settings). You can ignore it on weeks when nothing changed; reply to it when there's a positive reply you should personally handle.

- **Daily followups** runs silently most days. You'll only get notified when a positive reply comes in that needs you to write a real response. This is the high-value notification — treat it like a Slack DM from your best customer.

- **Post-campaign debrief** is for when you want to know *now* whether a campaign worked, instead of waiting for the next Monday. Run it manually 7 days after a campaign goes out.

## What these don't do

- They don't send autonomously without you in the loop on positives. The state machine sends scheduled follow-ups (which you already approved when you created the campaign), but never an inbound reply to a real human.
- They don't classify reply intent better than you can. If the LLM marks something as "positive" that you think was lukewarm, override it. The classification rubric is in `skills/gtm-get-better/SKILL.md` if you want to read or tune it.
- They don't run when Cursor isn't open or when your Mac is asleep. Cursor Automations require a running Cursor instance (cloud automations are coming; check the latest docs).

## Editing the schedule

Open the `.workflow.json` you want to change, edit the `cron` and `timezone` fields, and re-import. Or just edit the saved automation in the Cursor Automations UI directly — no need to round-trip through the file.

Standard cron, 5 fields, UTC unless `timezone` is set: `minute hour day-of-month month day-of-week`.

## When to add your own

After a month of running these three, you'll probably want one or two more. The pattern is the same: each file is an agent prompt + a trigger. Common ones founders add:

- **Friday wrap-up**: end-of-week summary of replies, drafts pending, and next week's outreach plan.
- **Specific play monitor**: re-run a single play's debrief automatically every Friday.
- **Inbound-from-X**: when xmcp gets reliable webhook support, ping when a prospect replies on X.

Drop new `.workflow.json` files in this directory and re-import via Path 1.

# Cursor Automations for founder-gtm

Cursor Automations are scheduled or event-triggered agent runs, configured in Cursor's Automations editor. They turn this plugin from a set of skills you remember to run into a system that runs on its own and pings you when it matters.

This folder is a set of **automation specs** you create once. Each spec below is fully drafted: name, trigger, tools, prompt, and the deferred settings you finish in the editor.

## How to install

You have two paths:

**Easy.** Open Cursor's Automations UI, click "New", and copy the fields from the spec below into the form.

**Easier.** Open chat in your Cursor workspace and type:

> "Create the founder-gtm weekly-get-better automation from the installed Founder GTM plugin's `automations/weekly-get-better.md` file."

The built-in `automate` skill will pick it up, run the integration discovery for any Slack channels or repos it needs, show you a draft table, and open the Automations editor pre-filled with the right values.

You can do the same for the other two specs.

## The three automations to start with

| Automation | Trigger | Why it matters |
|---|---|---|
| `weekly-get-better` | Cron, Monday 9am local | Closes the learning loop. Skipping it is what turns this plugin into a one-shot tool. |
| `daily-followups` | Cron, weekdays 7am local | Advances the cold-email sequence one step and sends queued follow-ups under the daily cap. |
| `post-campaign-debrief` | Slack message or manual trigger | Right after a campaign finishes, ingest replies and tell you what worked. |

Two more, optional, that founders commonly want once the first three are running:

| Automation | Trigger | Why it might matter |
|---|---|---|
| `positive-reply-ping` | Cron, weekdays 9am local | Notifies you only when a reply was classified positive. Keeps noise low. |
| `trial-expiry-sweep` | Cron, Tuesday + Saturday 7am local | For PLG founders on Stripe. Surfaces trials ending in 7 days with enough seats to be worth a touch. |

Each spec is its own markdown file in this folder.

## Notes on Cursor Automations

- They run in Cloud Agents, so they keep working when your laptop is closed.
- Each one needs to be reviewed in the Automations editor before saving (channel IDs, repo scopes, schedule, etc.). The specs below mark every field that needs to be finalized there.
- You can disable any automation from the same UI without deleting it.
- Cloud compute pricing applies; see the [Cloud Agent dashboard](https://cursor.com/dashboard?tab=cloud-agents).

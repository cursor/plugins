# Automation: trial-expiry-sweep (optional, PLG founders on Stripe)

> Twice a week, find trials ending in 7 days with enough seats to be worth a personal touch.

## Spec

| Field | Value |
|---|---|
| **Name** | trial-expiry-sweep |
| **Description** | Queries Stripe for subscriptions in trial status with `trial_end` within the next 7 days, filters by min seat count or MRR threshold, and outputs a CSV under `prospects/` for the founder to run an outreach campaign against. Pattern lifted from how the internal Cursor growth team surfaces expiring high-value trials. |
| **Trigger** | Cron: `0 7 * * 2,6` (Tuesdays + Saturdays 7am local) |
| **Tools** | `mcp` — pointed at your Stripe MCP server (or `gh` if you're storing trial data elsewhere). |
| **Prompt** | Using the Stripe MCP, list subscriptions with `status='trialing'` and `trial_end` between now and 7 days from now. For each, pull the customer's company, seat count, and primary contact email. Filter to trials with at least 5 seats (or whatever threshold matches the founder's PLG motion, read from `sales-pack.md` § "Buying signals"). Write the result to `prospects/trial-expiry-YYYY-MM-DD.csv` using the standard gtm-find-prospects schema. Then post a one-line summary to {{slack channel or DM}} with the count and a suggestion to run `/gtm-design-play` if there are more than 5. |

## To finish in the Automations editor

- **MCP server name.** Confirm the exact Stripe MCP server name as the Cloud Agent will see it.
- **Threshold tuning.** Edit the prompt to reflect your actual minimum seat count or MRR.
- **Slack channel** (required for the summary).
- **Cloud compute.** Twice-weekly runs are cheap unless you have hundreds of trials.

## Prerequisites

- An active Stripe MCP server (e.g. the official Stripe MCP or a custom one).
- A PLG product with self-serve trial signups.
- A sales-pack with a defined "trial expiry" signal in § Buying signals.

## When to disable

- You've stopped offering trials (most founders eventually move to a freemium model).
- You don't have time to act on the surfaced list. An unactioned signal is worse than no signal.

## When to upgrade

Once you have 3 months of expiry → conversion data, add a second filter on usage in the last 7 days. Trials with high recent usage convert at much higher rates than trials with declining usage. Use both signals together to focus your outreach on the trials most likely to convert.

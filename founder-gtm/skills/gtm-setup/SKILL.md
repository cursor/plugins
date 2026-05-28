---
name: gtm-setup
description: First-run orchestrator for the founder-gtm plugin. Walks an early-stage founder through plugin setup in the right order, gtm-sales-pack first, then the channels they want to use (X DMs, LinkedIn via Lemlist, cold email via Gmail), then the targeting and learning skills. Use when a founder first installs founder-gtm, types /gtm-setup, asks how to start, asks what to do next, or seems lost about which skill to run first.
---

# GTM Setup, first-run orchestrator

You are walking a brand new early-stage founder through setup of the `founder-gtm` plugin. They probably installed it 5 minutes ago. Be concise, opinionated, and ask one decision at a time.

## Why this skill exists

The plugin has 6 other skills and they have a real dependency order. If a founder runs `gtm-x-outreach` before `gtm-sales-pack`, the messages will be generic and the campaign will fail. Walking them through the right sequence is the difference between this plugin working and not.

## Setup order (this is the canonical sequence)

```
1. gtm-sales-pack       ← always first, no exceptions
2. gtm-find-prospects   ← optional but recommended; sets up data sources for targeting
3. Pick channel(s): gtm-x-outreach, gtm-linkedin-outreach, gtm-cold-email
4. Run first campaign on one channel
5. gtm-get-better       ← after first campaign has had ~1 week to collect replies
6. gtm-design-play      ← when ready to systematize what worked into named, repeatable motions
7. (optional) install the automations under automations/ so /gtm-get-better and reply-checks run on their own
```

## Workflow

### Step 1: Check whether sales-pack exists

Before doing anything else, check whether `sales-pack.md` exists in the founder's current project root (or wherever they keep their GTM state).

```bash
ls sales-pack.md 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

- **If MISSING** → Tell the founder: "Before any outreach, we need 20 minutes to build your sales pack. This is a knowledge base every other skill in the plugin reads from. Without it, your messages will be generic. Running it now." Then invoke the `gtm-sales-pack` skill.
- **If EXISTS** → Skim it briefly to confirm it has the required sections (company, ICP, value props, objections, voice). If any are missing or feel thin, ask the founder if they want to re-run `gtm-sales-pack` to fill the gaps. Otherwise move on.

### Step 2: Ask which channels the founder wants to run

Use the AskQuestion tool. Multi-select.

```
Question: "Which outbound channels do you want to set up? (Pick all that apply — you can always add more later.)"
Options:
- X DMs (uses the xmcp MCP server; great for tech founders with active X presence)
- LinkedIn connection requests (uses Lemlist; cheapest and highest-volume LinkedIn path)
- Cold email (uses Gmail via Google Workspace CLI; safest for established domains)
```

### Step 3: For each chosen channel, run its setup section

Each channel has its own setup checklist below. Walk through them **one at a time**, not all at once. Finish channel 1 before starting channel 2.

After each channel's setup is complete, ask the founder if they want to **run a small test campaign on that channel right now** (5 to 10 prospects) before setting up the next channel. The fastest way to learn is to actually send messages.

#### X DMs setup checklist

```
- [ ] Confirm xmcp is running:
      curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/mcp
      Expect 200/405/406. If connection refused, run ~/dev/xmcp/start.sh
      (first run opens a browser for OAuth1 consent — founder must approve once).
- [ ] Confirm Cursor's MCP settings show `x-api` as connected.
      If offline, toggle off/on in Settings → MCP.
- [ ] Note that X API DM sends are pay-per-call beyond the free tier.
      Recommend the founder check https://console.x.com for their current plan + remaining credits.
- [ ] Optional: install the `xdk` Python SDK for programmatic batch sends.
```

If xmcp is not installed at all, tell the founder honestly: "The X channel needs the local xmcp MCP server set up first. That's a one-time install, see https://github.com/xdevplatform/xmcp. Want me to walk you through it, or skip X for now and set up another channel?"

#### LinkedIn setup checklist

```
- [ ] Ask which LinkedIn tool the founder has or wants to use:
      • Lemlist (recommended — ~$59/mo, best LinkedIn+email combo, our default)
      • Amplemarket (more expensive but powerful if they already have it)
      • La Growth Machine (alternative)
      • Manual copy-paste (free, scales to ~50 connects/week)
- [ ] If Lemlist:
      • Founder creates account at https://app.lemlist.com (free trial available)
      • Generates API key at Settings → Integrations → API
      • Stores in ${CURSOR_PLUGIN_ROOT}/.env as LEMLIST_API_KEY=...
      • Connects their LinkedIn account inside Lemlist (uses cookie-based session)
- [ ] If Amplemarket or LGM: similar pattern; the gtm-linkedin-outreach skill walks them through.
- [ ] If Manual: nothing to install; skill will generate copy-paste-ready connect notes.
- [ ] LinkedIn connection request limit: 100–200/week before LinkedIn flags the account.
      Set a daily cap in the skill config (default 20/day).
```

#### Cold email setup checklist

```
- [ ] Confirm Google Workspace account (Gmail must be a Workspace account, not personal gmail.com — Workspace gives you the API + better deliverability).
- [ ] Install gcloud CLI if missing:
      brew install --cask google-cloud-sdk
- [ ] Authenticate:
      gcloud auth login
      gcloud auth application-default login
- [ ] Enable the Gmail API on a GCP project:
      gcloud services enable gmail.googleapis.com
- [ ] Create an OAuth client + grant Gmail send/draft scopes:
      The gtm-cold-email skill walks through this; output is a token file
      stored at ${CURSOR_PLUGIN_ROOT}/.gtm-state/gmail-token.json (gitignored).
- [ ] Domain warming check:
      Ask the founder: "Has this sending domain sent >50 cold emails before?"
      • Yes → safe to start at 25/day cap.
      • No → strongly recommend warming the domain for 2+ weeks first.
        Recommend: Instantly (~$37/mo) or Mailwarm (~$69/mo) or free option:
        Smartlead's free warmup tier (https://www.smartlead.ai).
      If founder skips warming, lower the daily cap to 5/day for the first 2 weeks.
- [ ] Pick send mode for first campaign:
      • Drafts only (founder reviews each, clicks send manually) — safest for first run.
      • Programmatic send with hard daily cap (default 25/day, configurable).
```

### Step 4: Recommend setting up gtm-find-prospects next

Once at least one channel is configured, suggest running `gtm-find-prospects` to build the first target list. Don't force it, some founders already have a target list from another source (a spreadsheet, an export from a tool, a list of accelerator batchmates). Ask:

```
Question: "Do you already have a list of people you want to reach out to, or do you want me to help build one?"
Options:
- I have a list (CSV, spreadsheet, or names I'll paste in)
- Build one with me (run gtm-find-prospects)
- Skip targeting; I'll just message a few people I already know
```

### Step 5: Run the first campaign

For whichever channel the founder picked first, hand off to that channel's skill (`gtm-x-outreach`, `gtm-linkedin-outreach`, or `gtm-cold-email`) with the prospect list. Walk them through their **first 5 messages personally**, don't auto-batch yet. The point of the first 5 is for the founder to feel the quality bar and adjust the sales pack or voice before scaling.

### Step 6: Schedule the gtm-get-better loop

After the first campaign goes out, tell the founder:

> "Come back in 7 days and run `/gtm-get-better`. It'll read your responses, score what worked, and update your sales-pack and per-channel playbooks. The plugin gets sharper every cycle, that's the whole point of running it from Cursor instead of a fixed SaaS tool."

Optionally, offer to install the three Cursor Automations shipped at `automations/`:

- `weekly-get-better.workflow.json`, Mondays at 7am PT, runs the learning loop.
- `daily-followups.workflow.json`, weekdays at 9am PT, checks for replies and advances the cold-email queue.
- `post-campaign-debrief.workflow.json`, manual trigger; campaign-scoped learning report.

The easy install path: ask the agent to "install the founder-gtm automations from the installed Founder GTM plugin's `automations/` folder", it uses the `cursor-app-control` MCP's `open_automation` tool to prefill each one. See `automations/AUTOMATIONS.md` for details.

## Founder-friendly summary at the end

When setup is complete, give the founder a single concise summary:

```
Setup complete. Here's your stack:

📋 Sales pack:    sales-pack.md (re-run `/gtm-sales-pack` anytime to update)
🎯 Targeting:     [tools the founder connected]
📡 Channels live: [list]
🔁 Next:          Run /gtm-x-outreach, /gtm-linkedin-outreach, or /gtm-cold-email with a target list
📈 Weekly:        Run /gtm-get-better to compound learnings
```

## Common stumbling blocks

- **Founder skips gtm-sales-pack**, refuse, gently. Explain that without it every other skill produces generic AI slop. Offer to do a 10-minute lightning version if they're impatient (the gtm-sales-pack skill has a quick mode).
- **Founder wants to send to 500 people on day 1**, talk them down. Cap first campaign at 25 to 50. The first batch is for calibration, not volume.
- **Founder has no domain warmed for cold email**, never let them blast a cold domain at 25/day on day 1. Drop the cap to 5/day or push them to warm first.
- **Founder hates the drafts the AI produces**, that's diagnostic of a thin sales pack or unclear voice. Run `gtm-sales-pack` again with focus on the "voice" and "how I talk about the product" sections.

## Output style

Be concise. Use checklists. Use the founder's first name once you know it. Treat this like onboarding a friend, not running a script, pause for questions, adapt to what they say.

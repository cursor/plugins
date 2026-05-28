# founder-gtm

> A scrappy go-to-market toolkit for early-stage founders. Built as a Cursor plugin.

Most early-stage founders fall into one of two traps. They blast generic AI templates that go straight to spam. Or they do nothing because the right tool stack costs $1,500 to $3,000 a month and they're not ready for it.

This plugin is a third path: spend an afternoon wiring up your own outbound machine using what you already have, send 25 real messages a day, and let the system get a little smarter every week.

## What's in the package

Three things ship together:

1. **This plugin**, ten skills you trigger from chat, three starter plays you can fork, five recommended Cursor Automations, six helper scripts, and two hooks (welcome + voice enforcement).
2. **A Cursor canvas** at `canvases/founder-gtm-playbook.canvas.tsx`, the visual playbook.
3. **`resources.md`**, a curated reading list of free or cheap GTM resources for founders.

## Install

```bash
/add-plugin founder-gtm
```

Then reload Cursor and run **`/gtm-setup`** for the 30-minute onboarding.

**Share link:** send people to the landing page or Marketplace listing. After install, tell them to run **`/gtm-setup`** in Cursor.

**Development only** (contributors hacking on this repo):

```bash
git clone https://github.com/cursor/plugins.git
cd plugins
ln -s "$PWD/founder-gtm" ~/.cursor/plugins/local/founder-gtm
```

Then reload Cursor and open the canvas at `canvases/founder-gtm-playbook.canvas.tsx`.

## The skills

| Skill | When to use | What it does |
|---|---|---|
| `/gtm-setup` | First install | Walks you through setup in the right order. Picks channels, runs prereqs. |
| `/gtm-playbook` | To open the visual guide | Opens the Founder GTM canvas and gives a short orientation before you start setup. |
| `/gtm-sales-pack` | Before any outreach | Interviews you (~25 questions, one at a time) about your company, ICP, value props, common objections, persona-specific positioning, and your writing voice. Writes a `sales-pack.md` knowledge base every other skill reads from. |
| `/gtm-find-prospects` | To build a target list | Asks what targeting tools you already have, then combines free sources (LinkedIn search, X via xmcp, GitHub, Crunchbase free, TechCrunch funding RSS, Show HN) with whatever paid tools you've connected. Outputs a ranked CSV. |
| `/gtm-design-play` | To codify what's working | Turns a signal/persona/channel/cadence combination that produced replies into a reusable play under `plays/<name>.md`. |
| `/gtm-x-outreach` | To run X DMs | Pulls each target's last 10 to 20 posts via the local xmcp MCP, finds a real hook, drafts a personalized DM in your voice, sends or saves to drafts. |
| `/gtm-linkedin-outreach` | To run LinkedIn outreach | Drafts ≤250-char connection notes grounded in the target's profile and your sales pack. Sends via Lemlist (recommended), Amplemarket, La Growth Machine, or manual copy-paste. |
| `/gtm-cold-email` | To run cold email | Connects to Gmail via the Google Workspace CLI, checks domain warming, drafts personalized sequences, saves them as drafts or sends with a hard daily cap. Reply detection cancels pending follow-ups when someone replies. |
| `/gtm-warm-intro` | When you have mutual connections (5 to 10x cold conversion) | Reads your exported LinkedIn connections CSV, matches bridges per prospect, drafts the intro-request message plus a forwardable blurb the bridge person can paste verbatim. Sends via Gmail or generates copy-paste markdown. |
| `/gtm-get-better` | Weekly | Reads logs across all channels, classifies replies on the standard rubric (positive / objection / neutral / OOO / negative), slices metrics per-play and per-touch, retires losing plays at N≥15, and proposes edits to the skill files themselves when a pattern wins consistently (founder approval required per edit). |

## Prerequisites at a glance

`/gtm-setup` walks you through these. Quick reference:

| Skill | Needs |
|---|---|
| `gtm-sales-pack` | Nothing required. Optionally: Gmail OAuth (reuses the cold-email token) so the voice section can extract patterns from your sent mail instead of asking you to paste samples. |
| `gtm-find-prospects` | Whatever tools you have. Nothing required. |
| `gtm-x-outreach` | Local xmcp MCP server running at `http://127.0.0.1:8000/mcp`. Free up to the X API free tier; pay-per-call beyond. |
| `gtm-linkedin-outreach` | Lemlist account + API key (cheapest path). Or Amplemarket / La Growth Machine if you already have them. |
| `gtm-cold-email` | Google Workspace account (not free gmail.com), gcloud CLI installed, Gmail OAuth client. Domain should be warmed (the skill recommends Instantly or Smartlead's free tier if not). |
| `gtm-warm-intro` | LinkedIn connections export CSV (Settings → Data Privacy → Get a copy of your data). Optional: Gmail OAuth for "last interaction with this bridge person" recency scoring. |
| `gtm-get-better` | One prior campaign to learn from. |

## What's in the plugin folder

```
founder-gtm/
├── README.md
├── distribution.md
├── CHANGELOG.md
├── LICENSE
├── resources.md
├── .cursor-plugin/plugin.json
├── canvases/
│   └── founder-gtm-playbook.canvas.tsx
├── rules/
│   └── gtm-voice-guide.mdc
├── hooks/
│   ├── hooks.json                          (sessionStart + afterFileEdit)
│   ├── welcome-on-first-session.sh         (first-run greeting)
│   └── check-voice-on-edit.sh              (AI-tell scan on saved drafts)
├── skills/
│   ├── gtm-setup/
│   ├── gtm-playbook/
│   ├── gtm-sales-pack/
│   │   ├── SKILL.md
│   │   └── scripts/extract-voice-from-gmail.py  (reads sent mail for voice patterns)
│   ├── gtm-find-prospects/
│   │   ├── SKILL.md
│   │   ├── scripts/                (5 small scrapers + helpers)
│   │   └── data/                   (title keyword lists, personal-email domains)
│   ├── gtm-design-play/
│   │   ├── SKILL.md
│   │   └── plays/                  (3 starter plays to fork)
│   ├── gtm-x-outreach/
│   ├── gtm-linkedin-outreach/
│   ├── gtm-cold-email/
│   │   ├── SKILL.md
│   │   └── scripts/gmail-auth.py   (one-time OAuth bootstrap)
│   ├── gtm-warm-intro/             (5 to 10x cold conversion via mutual connections)
│   └── gtm-get-better/
└── automations/
    ├── README.md
    ├── weekly-get-better.md
    ├── daily-followups.md
    ├── post-campaign-debrief.md
    ├── positive-reply-ping.md       (optional)
    └── trial-expiry-sweep.md        (optional)
```

## License

MIT. Fork it, remix it, send PRs.

---
name: gtm-warm-intro
description: Run warm-intro outreach for an early-stage founder. Reads the founder's LinkedIn connections CSV export, cross-references against a prospects/*.csv from gtm-find-prospects, finds 1st-degree bridges at each prospect's company, ranks intro candidates by connection strength and recency, drafts a request message to the bridge person plus a forwardable blurb the bridge can paste verbatim, and either sends via Gmail (if email path) or generates copy-paste markdown (for Slack or other channels). Warm intros convert at 5 to 10x cold. Use when the founder wants to leverage their network, mentions warm intros or referrals, runs /gtm-warm-intro, or after gtm-find-prospects has produced a target list.
---

# Warm Intro, the highest-leverage outbound channel

Warm intros convert at 5 to 10x the rate of cold outreach. The single highest-leverage move in early-stage outbound is asking a mutual connection for an intro, and giving that connection a forwardable blurb so they have zero work to do.

This skill turns the founder's existing LinkedIn network into an intro pipeline.

## Why this exists

Cold email and DM are mass channels. Warm intros are surgical. A founder typically has 200 to 2000 LinkedIn 1st-degree connections, and any of them might bridge to a target prospect. The bottleneck is knowing **who** to ask, **how** to ask, and giving them a paragraph they can paste straight into a forward.

Most founders skip warm intros because the manual work is painful: matching prospects to connections, drafting a request that respects the bridge's time, writing a forwardable blurb. This skill does all of that.

## Prerequisites

```bash
test -f sales-pack.md || echo "MISSING sales-pack.md"
ls prospects/*.csv 2>/dev/null | head -1 || echo "MISSING prospects CSV (run /gtm-find-prospects first)"
test -f ${CURSOR_PLUGIN_ROOT}/.gtm-state/linkedin-connections.csv || echo "MISSING LinkedIn connections export"
```

Refuse to draft without `sales-pack.md` and a prospect list.

## Step 0: Get the LinkedIn connections export (one-time)

LinkedIn lets the founder export their full 1st-degree connection list with one click. Walk them through it:

```
1. LinkedIn.com → Me (top-right avatar) → Settings & Privacy
2. Data Privacy (left sidebar) → "Get a copy of your data"
3. Pick "Want something in particular?" → check "Connections" only (not the full archive, which takes 24 hours)
4. Request archive. LinkedIn emails a download link in about 10 minutes for connections-only.
5. Download the zip, unzip, find Connections.csv inside.
6. Move it to ${CURSOR_PLUGIN_ROOT}/.gtm-state/linkedin-connections.csv
```

The CSV columns LinkedIn provides: `First Name, Last Name, URL, Email Address, Company, Position, Connected On`.

If the founder already exported once, the file is reusable until they want to refresh (LinkedIn allows the export anytime).

## Workflow

### Step 1: Load the prospect list

```
Question: "Which prospect list are we running warm intros on?"
Options:
- Auto-detect (most recent prospects/*.csv)
- {{list discovered CSVs}}
- Paste a list of company + person rows inline
```

Load the CSV. Required columns for matching: `company` (always). Helpful columns: `full_name`, `linkedin_url`, `role`.

### Step 2: Match each prospect to bridge candidates

For each prospect row:

1. Normalize the prospect's `company` (lowercase, strip "Inc"/"LLC"/"Ltd", collapse whitespace).
2. Scan the LinkedIn connections CSV. A bridge candidate is a 1st-degree connection whose `Company` normalizes to the same value.
3. Collect all bridge candidates per prospect. A prospect with 0 bridges is dropped from this run (suggest cold channels for that one instead).

Output a tally to the founder:

```
Found bridges for 14 of 47 prospects:
  • 6 prospects with exactly 1 bridge
  • 5 prospects with 2 to 3 bridges
  • 3 prospects with 4+ bridges (pick the strongest)
```

The 33 prospects with no bridge stay on the prospect list for cold outreach via the other channel skills.

### Step 3: Rank bridge candidates per prospect

For each (prospect, bridge_candidate) pair, score the bridge:

| Factor | Weight | How to score |
|---|---|---|
| Recency of last interaction | 35 | Read from Gmail if available: search sent + received for the bridge's email, score by days since last message (≤30 = 35, ≤90 = 22, ≤365 = 12, older = 4). If no Gmail, ask the founder per bridge: "When did you last talk to {{bridge name}}?" |
| Connection strength | 30 | Heuristic: count mutual LinkedIn engagements (likes, comments) if the founder can paste a few examples. If unknown, default to 18 for "in the same circle" and 30 for "I would call them a friend" (ask the founder for the top 3 only). |
| Shared school or company | 20 | If the CSV `Position` history shows overlap with the founder's background (founder provides), or the bridge's `Company` was a prior employer of the founder. Use 20 for overlap, 0 otherwise. |
| Tenure at target company | 15 | Bridges who have been at the target company longer (look at "Connected On" as a weak proxy if no other data) score higher. Default 8. |

Pick the **highest-scoring bridge** per prospect. Tie-break by most recent interaction.

### Step 4: Pick the channel for the bridge ask

Ask the founder once per bridge (or once globally if a clear preference exists):

```
Question: "How will you reach {{bridge name}}?"
Options:
- Email (drafts via Gmail, sent via gmail-token.json if the founder has cold-email set up)
- Slack DM (generate copy-paste markdown)
- iMessage / WhatsApp / signal (generate copy-paste text)
- LinkedIn DM (generate copy-paste text)
- Skip this bridge
```

Persist per-bridge channel choices to `.gtm-state/warm-intro-channel-prefs.json` (keyed by the bridge's LinkedIn URL) so re-runs do not re-ask.

### Step 5: Draft the intro-request message to the bridge

Apply `gtm-voice-guide`. Constraints:

- Short: 4 to 6 sentences for email; 2 to 3 sentences for Slack/iMessage.
- Make the ask explicit: "would you be open to introducing me to {{prospect_name}} at {{company}}?"
- Acknowledge their time: offer the forwardable blurb so the bridge does no writing.
- Give them an easy out: "totally fine if not a fit or you do not know them well."

**Email format (4 to 6 sentences):**

```
Subject: quick ask, intro to {{prospect first name}} at {{company}}?

Hey {{bridge first name}},

{{One-sentence personal touch, reference last interaction or recent thing they did, do not fake it if there isn't one}}.

I am trying to get in front of {{prospect_name}} at {{company}}. {{One sentence on why now: signal, fit, etc.}}.

Any chance you would be open to an intro? I have written a forwardable blurb below so you would not have to write anything, just paste and send.

Either way, no pressure if it is not a fit or you do not know them well.

{{founder signature from sales-pack.md}}

---
Forwardable blurb (paste into a fresh email to {{prospect_name}}):

{{blurb, see Step 6}}
```

**Slack-style format (2 to 3 sentences):**

```
hey {{bridge first name}}, random ask: do you know {{prospect_name}} at {{company}} well enough to intro me? working on {{one phrase from sales-pack one-liner}} and they look like an exact fit. happy to send you a paragraph you can just paste, no writing needed on your end. total no worries if it is awkward.
```

### Step 6: Write the forwardable blurb

This is the high-leverage move. The bridge should be able to copy the blurb into a fresh email to the prospect and hit send with no edits.

Template (3 to 4 sentences):

```
{{prospect first name}}, meet {{founder first name}}, founder of {{company}}. {{One sentence on what the company does, lifted verbatim from sales-pack.md § One-liner}}. {{One sentence on the specific reason they should care: the signal from the prospect row, or the persona-fit reason}}. {{founder first name}} can take it from here, leaving you two to it.
```

Quality bar before saving:

- Reads like the bridge wrote it (warm, casual).
- Says exactly what the company does in one sentence (no "AI-powered platform that...").
- Mentions one concrete reason the prospect should care, not generic.
- Ends with the polite "leaving you two to it" or similar handoff phrase.

### Step 7: Show drafts and approve per bridge

Per bridge, display:

- Bridge name, current role + company, last interaction (if known), score
- Target prospect, the signal, why this bridge for this prospect
- The intro-request message (channel-formatted)
- The forwardable blurb

Ask:

```
Question: "Send this intro request to {{bridge_name}}?"
Options:
- Send (Gmail) or copy-paste-ready (other channels)
- Edit the request, then send
- Edit the blurb, then send
- Skip this bridge, try the next-best one for the same prospect
- Skip this prospect entirely
```

### Step 8: Send or hand off

**Email path:** if the founder has run `/gtm-cold-email` setup (Gmail token at `${CURSOR_PLUGIN_ROOT}/.gtm-state/gmail-token.json`), send via the Gmail API using the existing token. Subject and body as drafted. No tracking pixels. Plain text.

**Other channels:** write `outreach-log/warm-intros-pending.md` with one section per pending intro, channel-formatted for copy-paste. Tell the founder to send and then re-run `/gtm-warm-intro --mark-sent` to log them.

### Step 9: Log to outreach-log/warm-intros.jsonl

For every intro request the founder sends (or marks sent), append one line:

```json
{
  "timestamp": "2026-05-27T17:30:00Z",
  "campaign": "{{campaign-name}}",
  "bridge": {
    "name": "Alex Rivera",
    "linkedin_url": "https://linkedin.com/in/alexrivera",
    "company": "Acme",
    "channel": "email"
  },
  "prospect": {
    "name": "Jane Doe",
    "company": "Acme",
    "role": "VP Engineering",
    "linkedin_url": "https://linkedin.com/in/janedoe"
  },
  "request_message": "the full request we sent",
  "forwardable_blurb": "the full blurb",
  "gmail_message_id": "186abc..."
}
```

`gtm-get-better` reads this file and credits warm-intro positives against the bridges who said yes (and the bridges who never replied), so the founder learns which bridges are real intro paths vs the polite-but-flaky ones.

## Output to the founder

```
Warm intro campaign: {{campaign-name}}

Prospects with bridges: {{14}} of {{47}}
Intro requests sent: {{N}}
Intro requests copy-paste-ready (Slack/iMessage/LinkedIn): {{M}}

Top 3 bridges by score:
1. Alex Rivera (Acme) → Jane Doe (VP Eng): last talked 12 days ago, mutual investor connection
2. ...

Reminder: warm intros convert 5 to 10x cold. Reply with whatever the bridge sends back (yes, no, "let me think") and run /gtm-warm-intro --mark-sent if you reached out via Slack or iMessage so the log stays in sync.

Run /gtm-get-better next week to see which bridges actually converted.
```

## Honest limitations

- **LinkedIn connection CSVs go stale.** Re-export every 60 to 90 days, or sooner if the founder has connected with many people recently.
- **Bridge ranking is a heuristic.** The founder usually knows their network better than a script. Always show the top 3 candidates per prospect and let them override.
- **Some bridges will ghost.** Track non-response in `warm-intros.jsonl`; bridges who never reply after 2 asks should be flagged as low-yield.
- **Do not abuse the same bridge.** Cap intro requests per bridge at 1 per quarter unless the bridge volunteers more. The skill enforces this by reading the log before drafting.
- **No personal-email matching.** LinkedIn's CSV only includes the email the bridge chose to share with you (often empty). Email sends require the bridge's email to be in the CSV or in the founder's Gmail history.

## Companion skills

- `/gtm-find-prospects` produces the prospect list this skill consumes.
- `/gtm-cold-email` handles prospects who have no bridge.
- `/gtm-get-better` reads `outreach-log/warm-intros.jsonl` for compounding the learnings.

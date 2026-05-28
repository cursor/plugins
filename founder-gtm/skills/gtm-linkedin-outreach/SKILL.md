---
name: gtm-linkedin-outreach
description: Run personalized LinkedIn outreach for an early-stage founder. Reads a prospects CSV from gtm-find-prospects, fetches each target's LinkedIn profile context, drafts ≤250-char connection-request notes grounded in sales-pack.md, and sends via Lemlist (primary, recommended), Amplemarket, La Growth Machine, or generates copy-paste-ready text for manual sending. Use when the founder wants to run LinkedIn outreach, wants to send connection requests at scale, runs /gtm-linkedin-outreach, or has a prospect list with linkedin_url populated.
---

# LinkedIn Outreach, connection notes that get accepted

You are running a LinkedIn outreach campaign for an early-stage founder. The default channel inside LinkedIn is the **connection request with a personalized note**, capped at 300 chars by LinkedIn's UI, but the highest-performing notes are ≤250 chars.

## Step 0: Tool and daily-limit setup (do this first)

LinkedIn's rate limits are unforgiving and tool choice locks you in for the rest of the workflow. Settle both before any prerequisite checks.

### 0a: Confirm the LinkedIn tool

Read `${CURSOR_PLUGIN_ROOT}/.gtm-state/tools.json` if it exists; otherwise ask:

```
Question: "Which LinkedIn tool are we using? (We strongly recommend Lemlist, the cheapest at ~$59/mo and the best LinkedIn+email combo. The others work too if you already have them.)"
Options:
- Lemlist (recommended)
- Amplemarket (if you already pay for it)
- La Growth Machine (LGM)
- Manual: I'll copy-paste each note into LinkedIn myself
```

Persist the choice to `${CURSOR_PLUGIN_ROOT}/.gtm-state/tools.json` under key `linkedin_tool`.

### 0b: Pick the daily connect limit

LinkedIn caps connect requests at ~100/week before flagging; "safe" daily varies a lot by account type. Ask the founder which bucket they're in and use the table to recommend:

| Account type | Recommended daily limit | Notes |
|---|---|---|
| New LinkedIn account (less than 6 months old) | 5 to 10 connects/day | LinkedIn aggressively rate-limits new accounts |
| Established free account | 15 to 20 connects/day | Standard. About 100/week ceiling. |
| LinkedIn Premium | 20 to 30 connects/day | Slightly higher tolerance |
| Sales Navigator | 30 to 50 connects/day plus InMail credits | Highest tolerance. Use InMails for non-1st-degree connections. |

```
Question: "What's your LinkedIn account type? We'll recommend a safe daily connect limit."
Options:
- New account (<6 months): recommend 8/day
- Established free account: recommend 18/day
- LinkedIn Premium: recommend 25/day
- Sales Navigator: recommend 40/day
- Override (I'll set my own number)
```

Save the chosen integer as `LINKEDIN_DAILY_LIMIT` in `${CURSOR_PLUGIN_ROOT}/.env`. Also write the choice to `${CURSOR_PLUGIN_ROOT}/.gtm-state/tools.json` under `linkedin_daily_limit` so other tools see the same number.

### 0c: Per-day counter

Maintain `${CURSOR_PLUGIN_ROOT}/.gtm-state/linkedin-connects-{YYYY-MM-DD}.json`:

```json
{
  "date": "2026-05-27",
  "limit": 18,
  "sent_today": 0,
  "campaign_counts": { "seed-fundraisers-2026-05": 0 }
}
```

This mirrors the pattern `gtm-cold-email` uses for its daily cap. Increment `sent_today` on every successful send (Lemlist add-to-campaign, Amplemarket add-to-sequence, LGM enrollment, or a manual entry the founder marks sent). **Before each send, refuse if `sent_today >= limit`** and tell the founder: "Today's LinkedIn cap of {limit} is hit. Resume tomorrow or raise the limit in `.env` if your account can handle more."

## Prerequisites

```bash
test -f sales-pack.md || echo "MISSING sales-pack.md"
```

Refuse to draft without `sales-pack.md`.

## Tool-specific setup

### Lemlist (recommended path)

If first time:
1. Create account at https://app.lemlist.com (free trial).
2. Generate API key: Settings → Integrations → API → Generate.
3. Connect LinkedIn account inside Lemlist UI (Lemlist uses a cookie-based session, no LinkedIn API needed).
4. Store in `${CURSOR_PLUGIN_ROOT}/.env`:
   ```
   LEMLIST_API_KEY=...
   LEMLIST_TEAM_ID=...
   ```
5. Test: `curl -u :$LEMLIST_API_KEY https://api.lemlist.com/api/team` should return team JSON.

Lemlist API reference: https://developer.lemlist.com (search for "Add lead to campaign" and "LinkedIn invitation").

### Amplemarket

If first time:
1. Get API key from Settings → API.
2. Store as `AMPLEMARKET_API_KEY` in `.env`.
3. API docs: https://docs.amplemarket.com

### La Growth Machine

If first time:
1. Get API key from your LGM workspace settings.
2. Store as `LGM_API_KEY` in `.env`.
3. API docs: https://api-docs.lagrowthmachine.com

### Manual

Nothing to set up. We'll generate a markdown file with one note per prospect, formatted for fast copy-paste.

## Step 1: Load the prospect list

```
Question: "Which prospect list?"
Options:
- Auto-detect (use the most recent prospects/*.csv)
- {{list discovered CSVs}}
- Paste a list inline
```

Filter rows where `linkedin_url` is non-empty AND (`recommended_channel` is `linkedin` OR `multi`).

Ask for batch size, capped by the remaining daily allowance from `.gtm-state/linkedin-connects-{YYYY-MM-DD}.json` (`limit - sent_today`):

```
Question: "How many connection requests to draft? Today's remaining cap is {remaining} of {limit}."
Options:
- 5 (calibration)
- {remaining} (use the rest of today's allowance)
- All filtered, capped at {remaining}
```

If the founder asks for more than `remaining`, refuse and explain: "Your daily LinkedIn cap is {limit} (from `LINKEDIN_DAILY_LIMIT`). {sent_today} are already sent. Pick {remaining} or fewer, or re-run tomorrow."

## Step 2: For each prospect, gather LinkedIn context

LinkedIn has no public API. You can't programmatically fetch profile data without violating ToS or paying for enrichment tools. Workable approaches:

- **If the founder has Amplemarket/Apollo:** they include enrichment that returns profile JSON. Use that.
- **If using Lemlist with the Lemlist Chrome extension:** Lemlist scrapes profile data when the founder adds the lead via the extension. The API can read this enriched data on the lead object.
- **If gtm-find-prospects already added profile context to the `hook` column:** use that.
- **Otherwise:** ask the founder to paste the prospect's About section + last 3 LinkedIn posts. This sounds painful but for 15 prospects it's 10 minutes and produces far better notes than scraping.

The skill should default to the path most economical for the founder's tool stack.

## Step 3: Draft the connection note

Apply the `gtm-voice-guide` rule. LinkedIn-specific constraints:

- **≤250 characters** (hard cap; LinkedIn allows 300 but tighter performs better).
- **Plain text only.** No emojis. No formatting.
- **First sentence must reference something specific**, their About, a recent post, a recent role change, a shared connection, a recent company milestone.
- **Second sentence: one-line "why you".** Connect their context to what you do, in their language.
- **Optional third: micro-CTA.** Often just "would love to connect and trade notes."

Structure:

```
Hey {{firstname}}, {{hook — refers to something specific}}.

{{One line: how that connects to what you're working on. No pitch yet — this is a connection request, not a sales email.}}

{{Optional CTA: "Would love to connect" / "Open to swapping notes?"}}
```

**Examples of good ≤250 char notes:**

> Hey Jane, your post on AI evals being the new unit tests really resonated, we're building tooling around exactly that workflow at Acme. Would love to connect and compare notes.

> Hey Sam, saw you just joined Acme as Head of Eng, congrats. We work with a few similar Series A teams on scaling agentic coding workflows. Open to connecting?

> Hey Pat, loved your essay on PLG-led enterprise sales. We're an AI infra co figuring out exactly that motion right now. Would be great to connect.

**Examples of bad notes (do not produce these):**

> Hey Jane, I came across your profile and was impressed by your background. I'd love to connect and explore opportunities. *(Generic. Says nothing specific. Sounds like a recruiter spam template.)*

> Hi Sam, I'm building a tool that helps engineering teams 10x their velocity. Would love to demo it for you. *(Pitches in a connect request. Almost certainly declined.)*

## Step 4: Show drafts + approval

Per prospect, show:

- Name, role, company, score
- The context being referenced
- The draft note + character count
- Founder choices: Send / Edit / Skip / Find a different hook

## Step 5: Send via the chosen tool

**Before each send**, re-check `.gtm-state/linkedin-connects-{YYYY-MM-DD}.json`. If `sent_today >= limit`, stop the loop immediately and tell the founder how many actually went out vs how many were skipped. Increment `sent_today` only after a successful Lemlist/Amplemarket/LGM API confirmation, or after the founder marks a manual entry sent.

### Via Lemlist

1. Add the lead to a Lemlist campaign (or create a campaign first if none exists).
   ```
   POST https://api.lemlist.com/api/campaigns/{{campaignId}}/leads
   {
     "linkedinUrl": "...",
     "firstName": "...",
     "lastName": "...",
     "companyName": "...",
     "customFields": { "personalizedNote": "<the note>" }
   }
   ```
2. The Lemlist campaign should be configured (in Lemlist UI) with a LinkedIn connection-request step that uses the `personalizedNote` custom field as the note text.

Founders unfamiliar with Lemlist campaign setup: walk them through it once via the Lemlist UI; the skill then drives lead addition via API.

### Via Amplemarket / LGM

Similar pattern: add lead to a pre-built sequence; the tool handles the LinkedIn connection-send + retries.

### Via Manual

Generate `outreach-log/linkedin-{{campaign-name}}.md` with one entry per prospect:

```markdown
## Jane Doe — VP Engineering at Acme
LinkedIn: https://linkedin.com/in/janedoe
Score: 85

> Hey Jane, your post on AI evals being the new unit tests really resonated — we're building tooling around exactly that workflow at Acme. Would love to connect and compare notes.

[ ] Sent on: ______
```

Founder opens this file, clicks each LinkedIn link, pastes the note, sends, and checks the box. Slow but free.

## Step 6: Log the send

Append to `outreach-log/linkedin.jsonl`:

```json
{
  "timestamp": "2026-05-27T17:30:00Z",
  "campaign": "{{campaign-name}}",
  "prospect": { "name": "...", "linkedin_url": "...", "company": "...", "score": 85 },
  "context_used": "their About + their last post on AI evals",
  "note": "the full note we sent",
  "char_count": 234,
  "tool": "lemlist",
  "send_status": "queued",
  "lemlist_lead_id": "..."
}
```

## Step 7: Schedule follow-ups (after acceptance)

LinkedIn connection requests are just the door-opener. Real outreach is the **first message after they accept**.

The skill should queue a Touch 2 message to be sent 1 to 2 days after acceptance. The tool (Lemlist) handles the "fires when accepted" trigger natively. For manual users, generate a follow-up draft file they can reference once a connection is accepted.

Touch 2 template (≤500 chars, plain text):

```
Thanks for connecting, {{firstname}}.

{{Brief context — one specific thing about why your work is relevant to them, building on the hook from the connect note.}}

{{The actual offer: "Would a 15-min call make sense?" or "Want me to send a Loom showing how this works for {{similar company}}?" — pull the default CTA from sales-pack.md § "The one thing".}}

{{Founder signature from sales-pack.md}}
```

## Rate limits and best practices

- **LinkedIn caps connection requests at ~100/week.** Exceeding triggers warnings and eventual account restrictions. The Step 0 daily-limit table maps account types to safe daily numbers (5 to 10 for new accounts, up to 30 to 50 on Sales Navigator).
- **Connection acceptance rate target:** 30 to 40%. Below 25% means your notes need work (re-run with sharper hooks).
- **Lemlist's LinkedIn module limits:** ~50 connects/day per account; respect it on top of the Step 0 cap.
- **Premium account?** LinkedIn Premium / Sales Navigator gives ~150/week and InMail credits. Re-run Step 0b to raise `LINKEDIN_DAILY_LIMIT` if you upgrade mid-campaign.
- **Cap enforcement is hard, not advisory.** The per-day counter file refuses sends past the limit. If you need to raise it, edit `.env` and re-run Step 0b (don't bypass the counter).

## Honest limitations

- **LinkedIn has no public API for connection requests.** All tools (Lemlist, Amplemarket, LGM) work via browser automation or cookie-based session. LinkedIn can detect and ban. Use a real account, behave like a human, stay under limits.
- **Notes >300 chars get truncated by LinkedIn.** Stay under 300 always, ideally under 250.
- **Some prospects have "connection note disabled"**, you can only send a blank invite. The skill should detect this (Lemlist returns a flag) and ask the founder if they want to send a blank invite (lower acceptance rate but sometimes worth it for hot prospects).

## Output after the run

```
LinkedIn campaign: {{campaign-name}}
Sent: {{N}} | Drafts saved: {{M}} | Skipped: {{X}}
Tool: {{Lemlist / Amplemarket / LGM / Manual}}
Daily cap: {{sent_today}} of {{limit}} used today.

Top 3 hooks used:
1. Jane Doe — referenced her recent post on AI evals
2. ...

Watch for acceptances in {{tool}} or LinkedIn. Touch 2 will auto-fire 1–2 days after acceptance.
Run /gtm-get-better in 7 days to learn from response rates.
```

---
name: gtm-cold-email
description: Run personalized cold email outreach for an early-stage founder via Gmail (Google Workspace). Reads a prospects CSV from gtm-find-prospects, drafts a 3 to 4 step email sequence per prospect grounded in sales-pack.md, and either saves them as Gmail Drafts for manual review or sends them programmatically with a hard daily cap (default 25/day, configurable) and inter-send spacing. Includes domain-warming guidance, recommends Instantly/Smartlead/Mailwarm for cold domains, and never blasts an unwarmed domain. Use when the founder wants to run cold email outreach, has a list of prospect emails, runs /gtm-cold-email, or asks how to send emails at scale safely.
---

# Cold Email, sending without nuking your domain

You are running a cold email campaign for an early-stage founder. Cold email is the highest-leverage outbound channel when done right and the fastest way to permanently damage your sending domain when done wrong. The skill prioritizes **deliverability and quality over volume**.

## Prerequisites

```bash
test -f sales-pack.md || echo "MISSING sales-pack.md"

# Gmail API ready
gcloud auth list --filter=status:ACTIVE --format="value(account)" || echo "GCLOUD NOT AUTHED"
gcloud services list --enabled --filter="config.name:gmail.googleapis.com" --format="value(config.name)" || echo "GMAIL API NOT ENABLED"

# Founder-gtm Gmail token exists
test -f ${CURSOR_PLUGIN_ROOT}/.gtm-state/gmail-token.json || echo "MISSING gmail-token.json"
```

If any of these fail, run the [Gmail setup](#gmail-setup-one-time) section below before proceeding.

## Gmail setup (one-time)

The skill uses the official Google Workspace path: gcloud CLI + Gmail API + an OAuth client whose token is stored locally and gitignored.

### Why Google Workspace, not free gmail.com

- Workspace domains have far better deliverability for cold outbound.
- Workspace provides the admin controls needed to safely manage cold email (DKIM, SPF, DMARC).
- Cold email from a free `@gmail.com` address dies in spam folders within ~10 sends.

If the founder doesn't have Workspace yet: tell them to get one at workspace.google.com ($6-$18/user/month) on a dedicated outbound subdomain (e.g. `outreach.{{theirdomain}}.com`) so any sender-reputation damage stays off their primary domain.

### Setup steps

1. **Install gcloud CLI** (if missing):
   ```bash
   brew install --cask google-cloud-sdk
   gcloud init
   ```

2. **Auth as the Workspace user** who will send the emails:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

3. **Pick or create a GCP project** for this plugin (recommend a dedicated one to scope the OAuth credential):
   ```bash
   gcloud projects create founder-gtm-{{founder-handle}} --name="founder-gtm"
   gcloud config set project founder-gtm-{{founder-handle}}
   ```

4. **Enable the Gmail API:**
   ```bash
   gcloud services enable gmail.googleapis.com
   ```

5. **Create an OAuth client** (Desktop app type, Gmail API doesn't support service accounts for individual Gmail boxes):
   - Console: https://console.cloud.google.com/apis/credentials
   - Create Credentials → OAuth client ID → Desktop app
   - Download the client JSON to `${CURSOR_PLUGIN_ROOT}/.gtm-state/oauth-client.json`
   - Also: add the founder's email as a test user under OAuth consent screen (so they don't need verification for personal use).

6. **Grant scopes** (`gmail.send`, `gmail.compose`, `gmail.modify`):
   The skill provides a one-time helper script at `scripts/gmail-auth.py` (see [Scripts](#scripts) below). Running it opens a browser, the founder approves, and a refresh token is saved to `${CURSOR_PLUGIN_ROOT}/.gtm-state/gmail-token.json`.

7. **Verify DKIM/SPF/DMARC** on the sending domain. Workspace docs: https://support.google.com/a/answer/33786. Without these, deliverability is near zero.

8. **DNS warmup check:**
   - Domain registered <60 days ago → DO NOT cold-email yet. Warm for 4+ weeks first.
   - Domain established but never used for cold outbound → warm for 2 weeks first.
   - Domain has prior healthy sending volume → safe to start at 25/day.

## Domain warming guidance

Ask the founder:

```
Question: "Has this Workspace domain ever sent cold email before? Honest answer."
Options:
- Yes, regularly (safe to start at default cap)
- It's an established domain, but I haven't done cold outbound from it (warm 2 weeks first)
- It's a new dedicated outbound subdomain (warm 4 weeks first)
- It's the same domain as my product (think hard — sender reputation damage will affect ALL email from this domain)
```

If warming is needed:

| Tool | Cost | Notes |
|---|---|---|
| **Smartlead** | Free warmup tier | Recommended free option |
| **Instantly** | ~$37/mo | Best UX, includes warmup + inbox rotation |
| **Mailwarm** | ~$69/mo | Pure warmup focus |
| **Lemlist** | ~$59/mo | Has built-in warmup if using Lemlist for LinkedIn too |

For warming periods, cap real cold sends at 5/day max. Increase by 5/day each week until reaching the target 25/day.

## Workflow (after setup is done)

### Step 1: Load prospect list

```
Question: "Which prospect list?"
Options:
- Auto-detect (most recent prospects/*.csv)
- {{list CSVs}}
- Paste a list inline
```

Filter rows where `email` is non-empty AND (`recommended_channel` is `email` OR `multi`).

Show the founder the filtered count + breakdown by `email_confidence`:

```
Found 42 prospects with emails:
  • 18 confirmed
  • 14 pattern-guess
  • 10 unverified

Recommend: send to "confirmed" only on first run. Save "pattern-guess" as drafts you review. Skip "unverified".
```

### Step 2: Pick send mode

```
Question: "How do you want to send?"
Options:
- Drafts only — save to Gmail Drafts folder; you click send manually
- Send with my approval — show each draft; I approve, the skill sends
- Auto-send with cap — sends up to {{daily-cap}} today, spaced 2–5 minutes apart
```

Daily cap default: 25. Configurable via `.env`:
```
COLD_EMAIL_DAILY_CAP=25
COLD_EMAIL_MIN_INTERVAL_SECONDS=120
COLD_EMAIL_MAX_INTERVAL_SECONDS=300
```

Track today's sent count in `.gtm-state/send-counter-{{YYYY-MM-DD}}.json`. Refuse to exceed the cap.

### Step 3: For each prospect, draft the sequence

A campaign generates a **4-step sequence** per prospect, sent as Drafts now and scheduled (or as a single Touch 1 if the founder prefers manual cadence control).

Apply `gtm-voice-guide` + these cold-email specifics:

**Subject line rules:**
- 3 to 6 words. Mobile inbox; no room for hype.
- Specific, not aspirational.
- Include the prospect's company name or a specific signal where natural.
- Test the founder's instinct: would the founder open this email cold?

**Subject framework, what works, what fails, and why:**

| Pattern | Works because | Example |
|---|---|---|
| Pain or scaling question | Validates a struggle they're actually having; implies you've seen it before | "Scaling outbound to 100/day?" |
| "{{Company}}'s {{topic}}" | Feels 1:1; passes the "is this for me?" test in the inbox | "Acme's developer velocity" |
| Practical value, not pitch | Promises utility before claiming anything | "How we cut review time at Brex" |
| `Re:` thread on follow-ups | Familiar continuity; lower friction on touch 2+ | "Re: Acme's developer velocity" |
| Their name when you've talked before | High recognition for warm follow-ups | "Jane, quick follow-up" |

| Pattern | Fails because | Example |
|---|---|---|
| Aspirational claims | Inbox BS detectors trigger immediately | "10x your engineers", "Unlock the full power of X" |
| Product / version launches | Reads as a marketing blast, not a peer email | "Acme 2.0 is here" |
| Generic thought leadership | No "why you, why now" connection to the prospect | "Ramping on unfamiliar codebases" |
| Vague social proof | Which teams? What does "accelerating" mean? | "Top teams are accelerating with Acme" |

**Naming rule of thumb:** if the prospect already knows your product, your product name in the subject helps (recognition). If you're cold, lead with **their** company name or a specific pain, not your product name they don't know yet.

**Auto-flag in gtm-get-better:** any subject containing the words "unlock", "10x", "accelerating", or a version number ("2.0:") is high-risk regardless of N. Retire before they hit the dataset.

## Sender identity

The same email body can land 1.5 to 2x more positive replies when sent from a recognized company domain versus a personal Gmail. Internal A/B data from a more mature outbound team showed ~12% positive vs ~7% positive on the same play.

Apply this to founder-scale outbound:

- **Send from your company domain** (you@yourcompany.com), not a personal Gmail alias, once the domain is warmed.
- **For early founders without warm reputation:** use a dedicated outbound subdomain (e.g. `hello.yourcompany.com`) so any reputation damage stays off your product email.
- **Display name:** "Firstname Lastname" or "Firstname @ Company". Never "Sales Team", never "Outbound", never an alias the prospect can't connect back to you.
- **Reply-to:** always your actual email. Don't use a no-reply or a CRM-managed alias.
- **Plain text only.** No HTML. No tracking pixels. No images. These all hurt deliverability at founder volume and read as spammy.
- **No unsubscribe footer needed for low-volume B2B outreach to professional emails.** CAN-SPAM requires it for higher volume; add a one-line "no problem if not relevant, happy to drop it" if you're sending >50/day or to consumer addresses.

**Body rules:**
- 2 to 4 sentences. Hard cap 4. Long emails get archived.
- First sentence references the signal (the `hook` from gtm-find-prospects).
- One CTA, phrased as a question, on its own newline at the end.
- Plain text. No HTML, no images, no tracking pixels (kills deliverability and feels gross).
- No unsubscribe footer needed for low-volume B2B outreach to professional emails (legally, CAN-SPAM requires it only at higher volumes; check your jurisdiction). Add one if sending >100/day.

**4-step sequence template:**

**Step 1 (Day 0), The opener**
```
Subject: {{Company}}'s {{specific signal area}}

{{Hook line — references the prospect-specific signal from gtm-find-prospects}}

{{One line connecting their context to what you do, in their language.}}

{{Single CTA — a question, on its own line. CTA tier depends on signal_strength; see below.}}

{{Founder signature}}
```

**CTA tier matched to signal_strength (read this column from the prospect CSV):**

| signal_strength | Touch 1 CTA tier | Examples |
|---|---|---|
| `high` | direct ask | "Would a 15-min chat make sense?" / "Want me to set up an enterprise trial?" |
| `medium` | soft ask | "Would a quick Loom showing this be useful?" / "Open to swapping notes?" |
| `low` | content / peer ask | "Want me to send the playbook we wrote on this?" / "Happy to share what we've seen, interested?" |

Asking for a meeting on touch 1 of a low-signal play gets ignored. Asking for "the playbook" on touch 1 of a high-signal play leaves leverage on the table. Match the ask to the heat.

**Step 2 (Day 3 to 4), Value add**
```
Subject: Re: {{Step 1 subject}}

{{Different angle from Step 1 — share a relevant resource, customer outcome, or one-line insight.}}

{{Softer CTA — "happy to send the Loom" or "want me to share the playbook?"}}
```

**Step 3 (Day 8 to 10), Alternative offer**
```
Subject: Re: {{Step 1 subject}}

{{A lower-commitment alternative to the original CTA. "If a call's too much, would a 5-min Loom be useful?" or "Happy to send a one-pager you can forward to the team."}}
```

**Step 4 (Day 14 to 18), Breakup**
```
Subject: Re: {{Step 1 subject}}

{{Clean acknowledgment they're busy. One final offer or a referral ask. No guilt.}}

{{Example: "All good if not a fit right now. Anyone else at {{Company}} I should reach out to?"}}
```

### Step 4: Show drafts + approval

Display Step 1 for each prospect (Steps 2 to 4 are pre-generated but only sent if no reply).

Per prospect: name + company + signal + the 4-step preview. Founder choices: Send Step 1 now / Save all 4 as Drafts / Skip / Edit.

### Step 5: Send via Gmail API

Each send uses the Gmail API's `users.messages.send`. The skill's helper script (or inline tool calls) handles:

- Encoding the message as RFC 2822 + base64url.
- Threading: Steps 2 to 4 use the same Message-ID `In-Reply-To` so they thread under Step 1 in the recipient's inbox.
- Spacing: enforce `COLD_EMAIL_MIN_INTERVAL_SECONDS` between sends in auto-send mode.
- Cap enforcement: increment `.gtm-state/send-counter-{{date}}.json`; refuse to exceed cap.

Drafts mode: use `users.drafts.create` instead. Drafts appear in the founder's Gmail Drafts folder; threading still works on send.

### Step 6: Schedule Steps 2 to 4

For each prospect with Step 1 sent:
- Steps 2 to 4 are saved as Gmail Drafts immediately so the founder can review them anytime.
- A pending-followup log entry is created in `outreach-log/email-followups-pending.jsonl` with send-after dates.
- A reply-check needs to gate sends: before sending Step N, check via Gmail API if the thread has a reply from the recipient. If yes, abort the sequence for that prospect.

Re-run `/gtm-cold-email --followups` (or set a daily Cursor Automation) to process the pending queue.

### Step 7: Log every send

Append to `outreach-log/email.jsonl`:

```json
{
  "timestamp": "2026-05-27T17:30:00Z",
  "campaign": "{{campaign-name}}",
  "step": 1,
  "prospect": { "name": "...", "email": "...", "email_confidence": "confirmed", "company": "...", "score": 85 },
  "signal": "recent_funding",
  "hook_used": "Seed $4M led by Foo VC 2026-01-15",
  "subject": "Acme's developer velocity",
  "body": "the full message body",
  "send_mode": "auto" | "approval" | "drafts",
  "gmail_message_id": "186abc...",
  "thread_id": "186def...",
  "founder_action": "send" | "edit_send" | "draft_only"
}
```

## Reply handling, the state machine

Every cold-email sequence is a tiny state machine: the prospect either has not replied yet, has replied, or has timed out. The skill enforces this every time `/gtm-cold-email --followups` or `--check-replies` runs.

```
For each prospect with at least one touch sent:
  state = NOT_REPLIED (default)

  If any inbound message exists on the thread (from anyone other than us):
    classify the first inbound message per the rubric in /gtm-get-better
    state = REPLIED
    cancel all pending touches for this prospect
    write to outreach-log/email-replies.jsonl with the classification

  If state is NOT_REPLIED and the next scheduled touch time has passed:
    if today's send count < daily cap:
      send the next touch
      increment send count
      reschedule the touch after that

  If state is NOT_REPLIED and all 4 touches have been sent:
    state = COMPLETED_NO_REPLY
```

### `/gtm-cold-email --check-replies`

Run this at the start of every `--followups` cycle, or as its own automation:

1. Pull recent replies: `users.threads.list` with `q=in:inbox newer_than:14d`.
2. For each thread, check if it's a thread we initiated (cross-reference `thread_id` from `outreach-log/email.jsonl`).
3. For each thread with new inbound, take the **first** inbound message and classify it using the shared rubric (positive / objection / neutral / OOO / negative). See the `gtm-get-better` skill for the rubric definition.
4. Run OOO detection heuristics before LLM classification (cheap pre-filter):
   - `Auto-Submitted` header is set to anything other than `no`
   - Subject contains `out of office`, `OOO`, `auto-reply`, `[Auto Reply]`, `automatic reply`
   - Body matches `^(I'?m|I am) (out of office|on vacation|on leave|away)`
   - Body matches `I no longer work at`
5. Append one entry per thread to `outreach-log/email-replies.jsonl`:
   ```json
   {
     "timestamp": "...",
     "campaign": "...",
     "thread_id": "...",
     "prospect_email": "...",
     "classification": "positive|objection|neutral|ooo|negative",
     "is_first_reply": true,
     "reply_excerpt": "first 280 chars of the inbound message",
     "touch_at_reply": 2,
     "auto_classified": true
   }
   ```
6. For each `classification != null`, cancel any matching pending entries in `email-followups-pending.jsonl` (the state machine's "cancel all pending touches" step).
7. Surface positives to the founder in the next session summary so they can draft a personal reply.

### `/gtm-cold-email --followups`

Run this once a day (ideally via a Cursor Automation; see `automations/daily-followups.workflow.json`):

1. Run `--check-replies` first to ensure no stale pending touches.
2. Read `outreach-log/email-followups-pending.jsonl`.
3. For each entry where `send_after <= now` AND prospect state is `NOT_REPLIED`:
   - Verify daily cap hasn't been hit.
   - Send via Gmail API (the draft already exists from the initial campaign run).
   - Log the send to `outreach-log/email.jsonl`.
   - Remove the entry from pending.
4. Output a summary of what was sent + what was skipped (and why).

### Reply auto-handling, what we do NOT do

We never auto-reply to inbound. Two reasons:

1. Reputation: an autonomous bot replying as the founder is the fastest way to destroy trust if it gets something wrong.
2. Conversion: a real reply from the founder to a positive lead converts at orders of magnitude higher than a bot reply.

What we DO offer: when `--check-replies` finds a positive, surface it to the founder + offer to draft a personal reply in their voice (using `sales-pack.md` for tone). The founder reads and clicks send.

## Honest limitations

- **You're sending from your founder's primary email**. Reputation damage compounds. Use a dedicated outbound subdomain when scaling.
- **Gmail's per-day send limits**: Workspace allows 2,000 sends/day total. Cold email volume should sit far below that.
- **Sequencing requires the founder to leave Cursor open or run a Cursor Automation**. The skill doesn't have a background daemon. The simplest model: re-run `/gtm-cold-email --followups` daily.
- **Pattern-guessed emails bounce more often.** Bounces above ~5% hurt domain reputation. Always verify (NeverBounce free tier, mail-tester.com) before sending pattern-guessed addresses.

## Scripts

The skill ships with one helper script, `scripts/gmail-auth.py`, that the founder runs once during setup. It does the OAuth flow against the OAuth client they created at `console.cloud.google.com/apis/credentials` and saves a refresh token to `.gtm-state/gmail-token.json` (chmod 600). All subsequent sends use that saved token directly via `google-api-python-client`.

Run it once:

```bash
pip install google-auth-oauthlib google-api-python-client
python scripts/gmail-auth.py
```

## Output after the run

```
Cold email campaign: {{campaign-name}}
Step 1 sent: {{N}} | Step 1 saved as drafts: {{M}} | Skipped: {{X}}
Daily cap remaining today: {{remaining}} of {{cap}}
Steps 2–4 saved as drafts (will send on cadence unless reply received).

Top 3 hooks used:
1. Jane Doe — Acme's recent $4M seed round
2. ...

Run /gtm-cold-email --followups daily to advance the sequence.
Run /gtm-cold-email --check-replies to ingest responses.
Run /gtm-get-better in 7 days to learn from reply patterns.
```

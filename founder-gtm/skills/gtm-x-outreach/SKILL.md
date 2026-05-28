---
name: gtm-x-outreach
description: Run personalized X (Twitter) DM outreach for an early-stage founder. Reads a prospects CSV produced by gtm-find-prospects, fetches each target's last 10 to 20 posts via the local xmcp MCP server, identifies a real hook in their recent thinking, drafts a personalized DM grounded in the founder's sales-pack.md, and either saves drafts for review or sends them with rate limiting. Use when the founder wants to run X DM outreach, says they want to message specific X users, runs /gtm-x-outreach, or has a prospect list with x_handle populated.
---

# X Outreach, personalized DMs at founder scale

You are running an X DM outreach campaign for an early-stage founder. Every DM must be grounded in something real the target recently said. Generic "saw your work, would love to chat" gets ignored.

## Prerequisites

Check all three before doing anything:

```bash
# 1. sales-pack.md exists
test -f sales-pack.md || echo "MISSING sales-pack.md"

# 2. xmcp MCP server is up
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/mcp
# Expect 200/405/406. If connection refused, run ~/dev/xmcp/start.sh and have the founder approve OAuth in browser.

# 3. The x-api skill at ~/.cursor/skills/x-api/SKILL.md is loaded (it has the xmcp tool reference)
```

If any prereq fails, fix it before proceeding. Refuse to draft messages without `sales-pack.md`.

**Read `~/.cursor/skills/x-api/SKILL.md`** for the xmcp tool naming convention and the `body`-wrapping pattern. This is the most common source of 400 errors.

## Workflow

### Step 1: Load inputs

```
Question: "Which prospect list are we running?"
Options:
- Auto-detect (use the most recent prospects/*.csv)
- {{list discovered CSVs}}
- Paste a list inline (founder will paste names + handles)
```

Filter the loaded CSV to rows where `x_handle` is non-empty AND (`recommended_channel` is `x` OR `multi`).

Show the founder the filtered count and ask:

```
Question: "Found {{N}} X-reachable prospects. Run on all of them, top 5, or pick manually?"
Options:
- Top 5 (calibration — recommended for first campaign)
- Top 20
- All {{N}}
- Pick manually (I'll show you the list)
```

### Step 2: Pick send mode

```
Question: "How do you want to handle sending?"
Options:
- Drafts only — I'll show each draft, you approve/send manually via X
- Send with my approval — I'll draft, ask for explicit "send" per message
- Auto-send with rate limit — drafts and sends with delay between messages (recommended cap: 10/day for new accounts, up to 50/day for warmed)
```

For first-time use, default-recommend "Drafts only" or "Send with my approval". Auto-send only after the founder has shipped 2 to 3 campaigns and is confident in quality.

### Step 3: For each prospect, research

Per prospect, in order of `score` descending:

1. **Resolve user ID.** Call xmcp `getUsersByUsername` with `{"username": "<handle without @>"}`. If 404, mark the row as "handle invalid" and skip.

2. **Pull recent timeline.** Call xmcp `getUsersIdTweets` (the user timeline tool) with `{"id": "<user_id>", "max_results": 20, "tweet.fields": "created_at,public_metrics,referenced_tweets"}`. Take the last 10 to 20 posts.

   Fallback if the tool name differs in this xmcp version: use `searchPostsRecent` with `{"query": "from:<handle>", "max_results": 20}`.

3. **Find the hook.** Scan the posts and pick exactly one to reference. Prefer in this order:
   - A post where they articulate a problem your product solves.
   - A post where they share an opinion you genuinely engage with.
   - A post about a recent ship/launch/hire/raise relevant to them.
   - A thread on a topic in your sales-pack's domain.

   Reject as hooks: posts older than 30 days (stale), retweets without comment, replies to others (out of context), engagement-bait threads, anything political/personal unless directly relevant.

   If no good hook exists, mark the prospect as "no recent hook" and downgrade to LinkedIn or email instead, do not send a generic DM.

### Step 4: Draft the DM

Apply the `gtm-voice-guide` rule (it's always-applied while this plugin is active). Specifically:

- **Length:** ≤500 characters. Tighter is better. The X DM input box is small.
- **Open with the hook**, not yourself.
- **One CTA**, phrased as a question, on its own line at the end.
- **Voice match**: use the founder's voice samples from `sales-pack.md` § "Voice, how I talk".

Use this structure:

```
{{Hook line — reacts to the specific post or thread}}

{{One sentence connecting their thinking to what your product does or who you serve. Do NOT pitch the product in detail.}}

{{CTA — single question. Often: "would a quick chat make sense?" or "want me to send you a Loom?" or "would it be useful to swap notes?"}}
```

Reference the post the hook is from at the end if natural ("the thread on X"). Don't paste URLs.

### Step 5: Show the draft

Display the draft alongside:

- Target name + handle + score
- The specific post the hook references (so the founder can validate it's a real reference)
- Sales pack value prop being implied (so they can sanity-check fit)
- Character count

Ask the founder:

```
Question: "Send this one?"
Options:
- Send
- Edit, then send (founder gives revised text)
- Skip — bad fit
- Skip — bad hook, find a different post for this person
- Abort campaign (stop the loop)
```

### Step 6: Send via xmcp (if approved)

Call xmcp `createDirectMessagesByParticipantId` with the `body`-wrapping convention:

```json
{
  "participant_id": "<user_id>",
  "body": {
    "text": "<the message>"
  }
}
```

**Common errors:**
- 400 `$.text: is missing` → you forgot to wrap under `body`. See the x-api skill.
- 403 → the recipient doesn't accept DMs from non-followers, or your account doesn't have DM permission. Mark the row and skip; suggest LinkedIn for this prospect instead.
- 429 → rate-limited. Pause; resume after the reset window.

### Step 7: Log the send

Append to `outreach-log/x-dms.jsonl` (one line per send):

```json
{
  "timestamp": "2026-05-27T17:30:00Z",
  "campaign": "{{campaign-name}}",
  "prospect": {
    "name": "Jane Doe",
    "handle": "@janedoe",
    "user_id": "1234567890",
    "company": "Acme",
    "score": 85
  },
  "hook_post_id": "1700000000000000000",
  "hook_post_excerpt": "first 140 chars of the post we referenced",
  "message": "the full message we sent",
  "char_count": 312,
  "send_status": "sent",
  "send_response_id": "DM ID returned by xmcp",
  "founder_action": "send"
}
```

The `gtm-get-better` skill reads this log to learn what hooks work.

### Step 8: Rate limit + follow-up scheduling

- Default delay between sends: 30 to 90 seconds (randomized). Helps avoid spam-flag heuristics.
- Default daily cap: 10 DMs/day for accounts with <1000 followers, 25/day for >1000, 50/day for >10k.
- Schedule follow-ups: after 4 days with no reply, queue a Touch 2. After 8 days, Touch 3. After 14, breakup. The `gtm-get-better` skill or a Cursor Automation can drive these.

Tell the founder: "Follow-ups are queued in `outreach-log/x-followups-pending.jsonl`. Re-run `/gtm-x-outreach --followups` to send the next round."

## What X DMs are great for and bad for

**Great for:**
- Tech founders with an active X presence (matching peers DM each other naturally on X).
- Devtools, AI, infra, design tools companies whose buyer persona lives on X.
- Hot-take or recent-event-driven outreach where speed matters.
- People who explicitly say "DMs open" or have a Calendly in their bio.

**Bad for:**
- B2B enterprise buyers (most don't check X DMs).
- People who don't follow you (your DM may go to the "Requests" inbox and get missed).
- Anything that requires formal tone or written depth, use email instead.

If the founder's ICP is mostly enterprise procurement, gently push them toward cold email or LinkedIn instead.

## Honest limitations

- **You pay per DM beyond the X API free tier.** Check `console.x.com` for current pricing. As of recent pricing, expect ~$200/mo for Basic tier with thousands of DMs.
- **xmcp holds OAuth1 in memory only.** Restart = re-consent. Don't restart mid-campaign.
- **One X account per xmcp process.** Sending from a different account requires editing `~/dev/xmcp/.env` and restarting.
- **X aggressively suppresses spam-pattern accounts.** Even with good messages, a brand-new low-follower account doing 50 DMs/day will get rate-limited or shadow-banned. Warm the account by posting and replying genuinely for 2 to 4 weeks before bulk DMing.

## Output to the founder after the run

```
X DM campaign: {{campaign-name}}
Sent: {{N}} | Drafts saved: {{M}} | Skipped: {{X}}

Top 3 hooks used (founder can study these):
1. Jane Doe — referenced her post on AI evals: "evals are the new unit tests"
2. ...

Follow-up Touch 2 queued for {{date}} ({{N}} prospects).
Replies will arrive in your X DMs inbox. Run /gtm-get-better in 7 days.
```

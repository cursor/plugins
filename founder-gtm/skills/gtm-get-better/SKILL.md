---
name: gtm-get-better
description: Weekly compound learning loop for the founder-gtm plugin. Reads outreach logs across all channels (X DMs, LinkedIn, cold email), classifies replies using the standard rubric (positive / objection / neutral / OOO / negative) on the first inbound message per thread, tallies metrics per-person-enrolled (not per-email) and sliced by play / channel / touch number, identifies winning hooks/subjects/openers, and writes timestamped updates to sales-pack.md plus per-channel learned-*.md files so the next campaign produces sharper messages. Includes a retirement rule (N>=15 sends, 0 positive replies, 2+ cycles → retire). Use weekly, after any campaign has had 7+ days to collect replies, when the founder runs /gtm-get-better, asks to learn from past outreach, or asks what's working.
---

# Get Better, compound learning loop

The whole reason to run outbound from Cursor instead of a fixed SaaS tool is that the system can get sharper every cycle. This skill is what makes that real.

## Inputs

```
outreach-log/x-dms.jsonl              every X DM sent
outreach-log/linkedin.jsonl           every LinkedIn note sent
outreach-log/email.jsonl              every cold email step sent
outreach-log/email-replies.jsonl      replies ingested by /gtm-cold-email --check-replies
outreach-log/manual-replies.jsonl     replies the founder hand-logs (X, LinkedIn)
plays/*.md                            play definitions (slice metrics by these)
sales-pack.md                         current source of truth (we append to it)
```

If `outreach-log/` is empty or every file is missing, tell the founder you need a campaign + ~7 days for replies before there's anything to learn from.

## The rubric (single source of truth)

Every reply gets classified as exactly one of:

| Label | Definition | Examples |
|---|---|---|
| **positive** | Prospect expressed real interest, asked a follow-up question, agreed to a meeting, or asked you to send more info | "Sure, would love to chat" / "Yes, send the Loom" / "What does pricing look like?" / "Can we do Thursday?" |
| **objection** | Prospect engaged but pushed back; usually worth replying to | "We're already on X" / "Not the right time" / "Send a one-pager and I'll look" / "What about [concern]" |
| **neutral** | Prospect replied but no clear engagement or pushback | "Got it, thanks" / "Will pass to the team" / single-emoji replies |
| **OOO** | Auto-reply, out of office, vacation responder, role-change auto-reply | "I'm out until Monday" / "I no longer work at X" / Auto-Submitted header present |
| **negative** | Hard no, unsubscribe, angry reply, mark-as-spam | "Stop emailing me" / "Remove from list" / "Don't contact me" |

**First-reply-only.** Only the first inbound message per thread is classified for metrics. Follow-up "thanks!" or scheduling-back-and-forth doesn't get re-classified, that would let later messages overwrite the real intent signal.

**OOO detection heuristics** (auto-classify, then the founder confirms):
- `Auto-Submitted` header set to anything other than `no`
- Subject contains "out of office", "OOO", "auto-reply", "automatic reply", "[Auto Reply]"
- Body matches `^(I'?m|I am) (out of office|on vacation|on leave|away)`
- Body matches `I no longer work at`

OOO replies stop the sequence (don't keep messaging someone on vacation) but are excluded from the positive-rate denominator.

## Workflow

### Step 1: Pick the lookback window

```
Question: "How far back are we learning from?"
Options:
- Since last /gtm-get-better run (default)
- Last 7 days
- Last 30 days
- All time
```

Default: since last run. Read `.gtm-state/last-gtm-get-better.json` for the timestamp.

### Step 2: Ingest fresh replies

Two paths:

**Cold email**, call `/gtm-cold-email --check-replies` first. This polls Gmail threads and writes new entries to `outreach-log/email-replies.jsonl`. Then classify each new entry per the rubric.

**X DMs and LinkedIn**, no programmatic reply ingestion exists. Walk the founder through unreplied prospects:

```
Question: "Any X DM or LinkedIn replies to log since last run?"
Options:
- Yes — walk me through prospects with no logged reply
- Skip (only learn from email replies)
```

If yes, show each unreplied prospect one at a time and ask: positive / objection / neutral / OOO / negative / no_reply. For positives or objections, ask for a one-line note of what the prospect said. Append to `outreach-log/manual-replies.jsonl`.

### Step 3: Compute metrics

For the lookback window, compute per channel **and** per play (using the `campaign` field in each log row, which matches a play name):

**The denominator is unique people enrolled, not messages sent.** A 4-touch sequence inflates message counts and makes plays incomparable. Always divide by people who got at least one message.

```
For each (channel, play):
  enrolled              = count(unique prospects with at least one outbound sent)
  total_sent            = sum of all outbound messages
  any_reply             = count(unique prospects with at least one reply of any kind)
  positive_replies      = count(unique prospects whose first reply was positive)
  objection_replies     = count(unique prospects whose first reply was objection)
  neutral_replies       = count(unique prospects whose first reply was neutral)
  ooo_replies           = count(unique prospects whose first reply was OOO)
  negative_replies      = count(unique prospects whose first reply was negative)

  reply_rate            = any_reply / enrolled
  positive_rate         = positive_replies / enrolled
  pos_plus_obj_rate     = (positive + objection) / enrolled
  ooo_filtered_rate     = positive_replies / max(1, enrolled - ooo_replies)
```

Also compute **per touch** within the cold-email channel:
- `positives_attributable_to_touch_N` (which touch produced the first reply, by touch number)

This tells the founder which follow-up is actually working. The common finding: touch 3 often produces more positives than touch 1.

### Step 4: Classify what's working

For each (channel, play) combination:

- **Winners** (positive_rate ≥ 3% AND enrolled ≥ 15): note opener / subject / hook source / persona segment.
- **Losers** (positive_rate = 0% AND enrolled ≥ 15): candidates for retirement.
- **Surprises**: anything that contradicts the founder's stated belief from `sales-pack.md`.
- **Too early to call** (enrolled < 15): list, but flag as hypothesis-only.

The N≥15 threshold is intentionally lower than enterprise growth teams use (N≥20 or 50). At founder volume, 15 is enough to start seeing direction without waiting forever.

**Auto-flag high-risk subject patterns (even before N≥15).** Subjects containing any of "unlock", "10x", "accelerating", or a version number ("2.0:") are dead-on-arrival patterns the internal Cursor growth team has retired with 4,000+ sends of data behind the call. Flag these immediately in the report so the founder can rewrite before more of the sequence fires.

**The "do not re-offer" rule.** Scan `outreach-log/*.jsonl` for prospects whose follow-up offer references an asset they already consumed (downloaded the guide, attended the webinar, read the case study). Flag these as "wasted touch" in the surprises section. The next touch should be what comes *after* the asset, not the asset again.

### Step 5: Retirement decision for losers

For each play that meets the retirement bar (0 positive, N≥15, ≥2 cycles run):

```
Question: "Play '{name}' has {N} sends, 0 positive replies, {X} OOO. This is the second cycle with these numbers. Retire?"
Options:
- Retire it (mark status: retired in plays/{name}.md)
- Iterate the messaging (run /gtm-design-play in iteration mode on this play)
- Iterate the signal or persona (start the play over from scratch)
- Keep watching for one more cycle (rare — only if there's an unusual reason)
```

Default recommendation: retire. Most weak plays do not get better with copy tweaks; the signal or persona is wrong.

### Step 6: Update sales-pack.md

Append a timestamped block to the `## Update log` section at the bottom of `sales-pack.md`:

```markdown
### Update — 2026-05-27 (from /gtm-get-better)

**Window:** since 2026-05-13 (14 days)
**Total enrolled across plays:** 87
**First replies:** 14 (6 positive, 3 objections, 2 neutral, 3 OOO)
**Positive rate (people enrolled):** 6.9%
**OOO-filtered positive rate:** 7.1%

**By play:**
| Play | Channel | Enrolled | Reply | Positive | Pos+Obj | Status |
|---|---|---|---|---|---|---|
| seed-funded-vp-eng-2026-01 | email | 38 | 18% | 10.5% | 13.2% | winner — double down |
| x-shipped-evals-2026-01    | x-dms | 24 | 16% | 8.3%  | 8.3%  | winner — double down |
| linkedin-ai-pms-2026-01    | li    | 25 | 8%  | 0%    | 4%    | retire after this cycle |

**By touch (cold email):**
| Touch | Sent | Positive | % of positives |
|---|---|---|---|
| 1 | 38 | 2 | 33% |
| 2 | 32 | 3 | 50% |
| 3 | 24 | 1 | 17% |
| 4 | (not run yet) | — | — |

**What worked:**
- Opener pattern "Saw your post on {{X}}" — 4 of 6 positives came from this.
- Signal "recent_complaining" outperformed "recent_funding" (positive_rate 9% vs 4%).
- Persona "Founding engineer at 5–25-person teams" replied at 12%; "VP Eng at 100+" at 0%.

**What didn't:**
- Subject "{{Company}}'s developer velocity" — 0 positive on 18 sends; retiring.
- Touch 1 CTA "would love to demo" — 0 replies on plays using it.

**Open objections heard (worth answering):**
- "We already use {competitor}" — 2 prospects; sharpen the wedge in sales-pack § Value props.
- "Tried similar things, didn't stick" — 1 prospect; consider a "small commitment" CTA option.

**Recommended sales-pack edits:**
1. Add "Founding engineer at 5–25-person teams" to top-priority personas.
2. Strengthen the wedge vs {competitor} in § Value props.
3. Test "5-min Loom" CTA instead of "15-min call" for objection-resistant prospects.
```

Append-only. Don't rewrite earlier entries.

### Step 7: Update per-channel learned files

For any channel with new learnings, write or append `outreach-log/learned-{channel}.md`:

```markdown
# Learned — X DMs

Last updated: 2026-05-27

## Opener templates to prefer
- "Saw your post on {{X}}" — current best (positive rate 7.1%, N=24)

## Opener templates to retire
- "Congrats on the new role" — 0 positive on N=18; retired 2026-05-27

## Signal source ranking (last 30 days)
1. recent_complaining (positive_rate 9%, N=24)
2. recent_funding (positive_rate 4%, N=51)
3. recent_role_change (positive_rate 0%, N=18 — retired)

## CTAs that work
- "would a quick chat make sense?" — N=12, positive_rate 8%

## CTAs that don't
- "would love to demo for you" — N=12, positive_rate 0%, retired
```

The channel skills read these files at the top of their workflow and bias drafting toward what's been working for this founder.

### Step 8: Surface top 3 actions

Don't drown the founder in numbers. End with three concrete next moves, in priority order:

```
Top 3 actions from this cycle:

1. Double down on 'recent_complaining' as a signal source. 3x positive rate vs other signals. Re-run /gtm-find-prospects with it as the primary signal.

2. Sharpen the wedge vs {competitor}. Two prospects raised it; you don't have a tight one-liner. Run /gtm-sales-pack and focus on § Value props § Wedge.

3. Retire the 'linkedin-ai-pms-2026-01' play after this cycle. 0 positive on N=25, second cycle. The signal or persona is wrong; copy tweaks won't fix it.
```

### Step 8.5: Propose skill file edits

The other steps update `sales-pack.md` and per-channel learned files. This step does something stronger: when a pattern is clearly winning, propose baking it into the **skill files themselves** so future runs default to it.

**Eligibility (conservative on purpose):**

- `N >= 20` sends backing the pattern.
- Pattern is statistically distinctive: `pattern_positive_rate >= 2x` other patterns in the same channel and persona.
- Pattern has held across at least two cycles (use `.gtm-state/skill-edit-history.jsonl` to check).
- Default is "propose, do not apply". Every change requires founder approval per edit.

**Targets:**

| Skill file | What gets edited | Example pattern |
|---|---|---|
| `gtm-x-outreach/SKILL.md` | Default opener template in Step 4 | "Saw your post on {{X}}" won 8 of 10 positives across 30 sends |
| `gtm-linkedin-outreach/SKILL.md` | Step 3 example block | "Hey {{name}}, your post on {{X}}" outperforms "Hey {{name}}, saw you just joined" |
| `gtm-cold-email/SKILL.md` | Subject framework table | "Re: {{Company}}'s X" converts 3x better than alternatives |
| `gtm-design-play/SKILL.md` | Offer ladder defaults | Soft Touch 1 CTA "want the playbook" beats direct ask on medium-signal plays |

**Workflow:**

1. Scan the metrics computed in Step 3 and the patterns surfaced in Step 4. For each pattern that meets eligibility, identify the candidate skill file edit.
2. Read the target skill file. Locate the exact section to change. Generate a unified diff proposal:

   ```diff
   --- gtm-x-outreach/SKILL.md
   +++ gtm-x-outreach/SKILL.md
   @@
   -{{Hook line, reacts to the specific post or thread}}
   +{{Hook line, reacts to the specific post or thread. Default opener template:
   +"Saw your post on {{topic}}, {{one sentence of genuine reaction}}." Won 8 of 10 positives across 30 sends in this founder's history.}}
   ```

3. Show the diff to the founder one edit at a time. AskQuestion:

   ```
   Question: "Apply this edit to gtm-x-outreach/SKILL.md? Evidence: 8 of 10 positives on N=30 across 2 cycles."
   Options:
   - Apply (writes the edit + adds a provenance marker)
   - Skip this edit
   - Apply but let me hand-tweak first (opens the file at the edit location)
   - Abort all skill edits
   ```

4. On approval, apply the edit and add a provenance marker comment right above the edited block:

   ```html
   <!-- compound-update: 2026-05-27 from /gtm-get-better -->
   ```

5. Append to `.gtm-state/skill-edit-history.jsonl`:

   ```json
   {
     "timestamp": "2026-05-27T17:30:00Z",
     "skill_file": "skills/gtm-x-outreach/SKILL.md",
     "evidence": { "pattern": "opener: Saw your post on X", "positives": 8, "sends": 30, "cycles": 2 },
     "approved": true,
     "edit_summary": "Made 'Saw your post on X' the default opener template"
   }
   ```

6. If the founder skips or aborts, log the proposal anyway with `approved: false` so the next cycle does not re-propose the same edit immediately. Re-propose after one more cycle of fresh evidence.

**Guardrails:**

- Never edit `rules/gtm-voice-guide.mdc` from this step. The voice rule is hand-curated; copy-paste-good-patterns drift it.
- Never delete sections. Only additive edits, or replacing example text inside a section.
- Show a max of 3 edit proposals per run. More than that overwhelms the review.

### Step 9: Persist the run

Write `.gtm-state/last-gtm-get-better.json`:

```json
{
  "timestamp": "2026-05-27T17:30:00Z",
  "window_start": "2026-05-13T17:30:00Z",
  "window_end": "2026-05-27T17:30:00Z",
  "totals": { "enrolled": 87, "positive": 6, "objection": 3, "neutral": 2, "ooo": 3, "negative": 0 },
  "play_decisions": [
    { "play": "seed-funded-vp-eng-2026-01", "decision": "double_down" },
    { "play": "x-shipped-evals-2026-01", "decision": "double_down" },
    { "play": "linkedin-ai-pms-2026-01", "decision": "retire_next_cycle" }
  ],
  "actions": [ "...", "...", "..." ]
}
```

## Output format to the founder

```
Learning cycle complete — 14-day window.
Enrolled: 87 prospects across 3 plays.
First replies: 14 (6 positive, 3 objections, 2 neutral, 3 OOO).
Positive rate: 6.9% (up from 4.2% last cycle).

Winners (keep running):
  ✓ seed-funded-vp-eng-2026-01 — 10.5% positive
  ✓ x-shipped-evals-2026-01    — 8.3% positive

Retire candidate:
  ✗ linkedin-ai-pms-2026-01    — 0% positive on N=25

Top 3 actions:
1. ...
2. ...
3. ...

Detailed update appended to sales-pack.md.
Per-channel playbooks updated.
```

## Honest limitations

- **X and LinkedIn replies require manual logging.** No reliable programmatic path. The skill prompts you.
- **Small samples lie.** When N<15 per play, treat findings as hypotheses, not conclusions. Flag explicitly.
- **Reply classification can drift.** Spot-check the LLM's classifications periodically.
- **Touch attribution is approximate.** "Positive after touch 3" doesn't mean touch 3 caused the positive, touches 1 and 2 set it up.

## Frequency

Run weekly during active outbound. Less often and the learning is stale. More often and you'll be reading noise from undersized samples.

If the founder runs `/gtm-get-better` more than once in 24 hours without new campaign data, push back: "No new data since last run. Come back after another campaign cycle."

## Companion skill

After a few cycles, the founder should design new plays from the learnings (via `/gtm-design-play`) and retire old ones. This skill identifies the candidates; `/gtm-design-play` builds the next iteration.

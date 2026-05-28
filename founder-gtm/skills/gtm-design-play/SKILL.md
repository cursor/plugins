---
name: gtm-design-play
description: Codify a working outbound motion into a reusable play. Distilled from how Cursor's growth team designs automated outbound plays internally (person vs account signals, persona match, channel choice, four-touch cadence, offer ladder), generalized for early-stage founders. Use after at least one campaign has produced replies and you want to capture the pattern, when a founder asks how to scale what worked, when /gtm-get-better surfaces a winning signal/persona combo, or when the founder says they want to systematize outreach.
---

# Design Play, turn a working motion into a repeatable play

A "play" is the smallest unit of repeatable outbound: one signal, one persona, one channel, one cadence, one offer ladder. Naming and structuring it the same way every time is what turns ad-hoc outreach into a system.

This skill borrows the framework Cursor's internal growth team uses (`generate-outbound-play-ideas`), stripped of the proprietary signals and metrics. The framework is sound. The signals are yours to define.

## When to design a play vs run one-off outreach

Design a play when:
- A signal has produced replies twice in a row from different people.
- You can describe the signal in one sentence without using the word "interested".
- The same persona is the buyer across both replies.

Don't design a play when:
- You've sent fewer than 25 messages of any kind.
- The replies came from prospects you already knew.
- The signal is "I think they'd care".

The point is to name what's already working, not to invent it.

## The play structure

Every play has five fields. Write them in this order. Each one constrains the next.

### 1. Signal
What event in the world tells you this person might be open to a message right now? Two flavors:

**Person signals**, a specific person did a specific thing.
- Example: VP Eng posted on X about evaluating AI code review tools.
- Example: Founding engineer registered for a workshop on prompt engineering.
- Example: CTO emailed support asking about SSO at a competitor.

**Account signals**, a company-level metric or event crossed a threshold.
- Example: Company hit a Series A in the last 60 days.
- Example: Team grew by 3+ engineers in the last 90 days.
- Example: 5+ users from the same domain signed up for the product.

Person signals get messaged directly. Account signals require enriching the account to find the right buyer first.

### 2. Persona
The role at the company you actually message. Default: a director-or-above engineering leader if you sell to engineering teams. Otherwise: whatever the sales-pack `## Personas` section lists.

If the signal is a person signal, the persona is usually that person. If it's an account signal, the persona is whoever can sponsor a meeting at that company.

### 3. Channel
Pick one. Not multi-channel. Plays branch by channel for a reason: cadence, format, and acceptable length differ by an order of magnitude.

- **X DM**, when the persona is active on X and the hook is from a recent post.
- **LinkedIn**, when the persona is a leader at an established company; safest default for cold.
- **Cold email**, when you have a verified email and the message needs more than a sentence to land.

### 4. Cadence
Four touches. Day 0, 3 to 5, 7 to 10, 14 to 18. Each touch has a different angle. The cardinal rule: do not repeat Step 1's angle in Step 2.

- **Touch 1:** signal-anchored opener. One soft CTA.
- **Touch 2:** new angle. Share something useful. Different CTA.
- **Touch 3:** lower-commitment alternative. (Loom instead of call, one-pager instead of demo.)
- **Touch 4:** clean breakup. Acknowledge they're busy. Offer one final thing or a referral ask.

Do not write a fifth touch. Diminishing returns and damaged sender reputation start there.

### 5. Offer ladder
Match the ask to the signal strength.

| Signal strength | Default Touch 1 CTA |
|---|---|
| High (just funded, just complained about your problem, asked support a buying question) | Direct: "want me to set up a call?" or "want to start a trial?" |
| Medium (recent role change, recent product launch in your space, content engagement) | Soft: "happy to send a Loom" or "want our playbook on X?" |
| Low (matches persona, no specific behavior) | Content only: "thought you'd find this useful", no meeting ask |

Sending a Touch 1 demo request on a Low-signal play is the fastest way to a 0% reply rate. The internal data is consistent on this.

## The "do not re-offer" rule

If a prospect already consumed the asset you'd otherwise offer (downloaded the guide, attended the webinar, read the case study), the next touch must be what comes *after* that asset. Not the asset again.

Example: someone downloaded your "scaling X" guide on Tuesday. Wednesday's Touch 1 should reference the guide and offer the next step (a walkthrough, a templated implementation, a related deeper resource), not the guide.

This is the single most common play-design mistake.

## Segmentation: one signal, two or three plays

Same signal often warrants different copy for different segments. Examples:

- **Workshop registrant**, attended vs registered-but-no-show needs different Touch 1.
- **Recent fundraise**, Seed vs Series B founders care about different things; same play, different framing.
- **Existing customer expansion** vs **cold company** on the same product-usage signal, totally different message.

Before drafting copy, list two or three segments and write Touch 1 separately for each. If you can't think of meaningful segments, you have one play, not three.

## Workflow

### Step 1: Identify the candidate motion

Pull from one of these inputs:
- `outreach-log/*.jsonl`, find a signal+persona combo with replies.
- The founder's stated hypothesis: "I think X works because Y."
- A `/gtm-get-better` run flagging a high-positive-rate pattern.

Show the founder the candidate. Confirm it's worth codifying.

### Step 2: Draft the play

Walk through the five fields. Ask one at a time. Use the recommended answer when the founder hesitates.

For signal strength, ask explicitly: "Is this high, medium, or low?" Map to the offer ladder.

### Step 3: Write the segments

Ask: "Are there subgroups within this signal that need different framing?" If yes, list them. Write a Touch 1 opener for each segment separately. Reuse Touches 2 to 4 across segments unless the segments differ enough to need separate sequences.

### Step 4: Validate

Run this checklist before saving:

- [ ] **Detectable signal.** Could you write a script (or set up a Lemlist/Smartlead trigger) that fires when this signal occurs?
- [ ] **Reachable persona.** Can you find email or LinkedIn or X handle for the people who fit this persona?
- [ ] **Offer matches signal.** High signal gets a direct ask; low signal gets content. No mismatches.
- [ ] **Not redundant.** If you have other plays, this one targets a distinct combination.
- [ ] **Helpful to recipient.** If you got this message at the timing the play targets, would you appreciate it? If no, the play needs rework.

Any failure means revise before saving.

### Step 5: Save to `plays/`

Write to `plays/{slug}.md` using the template below. Tell the founder which prospect list this play applies to and suggest running the matching channel skill (`/gtm-x-outreach`, `/gtm-linkedin-outreach`, or `/gtm-cold-email`) against that list with the play's segment in mind.

## Template

```markdown
# Play: {{Name}}

> Designed YYYY-MM-DD via /gtm-design-play. Update by re-running.

## Signal
**Type:** person | account
**Signal:** {{one-sentence description of the event/threshold that triggers this play}}
**Strength:** high | medium | low
**Detection:** {{how you'll actually catch this — script, manual scan, tool alert}}
**Source data:** {{where the signal lives — X search, TechCrunch RSS, product analytics, etc.}}

## Persona
**Title pattern:** {{e.g. "Director+ in Engineering" or "Founding engineer at 5-25 person team"}}
**Buying power:** decision-maker | influencer
**Sharpest hook for this persona:** {{one sentence}}

## Channel
**Primary:** x | linkedin | email
**Reason:** {{why this channel, not the others}}

## Segments
Two or three. For each, write a Touch 1 opener separately.

### Segment A: {{name}}
**Touch 1 opener:** {{verbatim copy}}

### Segment B: {{name}}
**Touch 1 opener:** {{verbatim copy}}

## Cadence (shared across segments)

| Touch | Day | Angle | CTA |
|---|---|---|---|
| 1 | 0 | Signal-anchored | {{from offer ladder}} |
| 2 | 3-5 | {{different angle — proof, content, peer reference}} | {{softer CTA}} |
| 3 | 7-10 | {{alternative offer — Loom, one-pager, async}} | {{lower-commitment CTA}} |
| 4 | 14-18 | Clean breakup | {{referral ask or "no vs not now?"}} |

## Offer ladder applied
- **Touch 1 CTA:** {{specific ask matching signal strength}}
- **Asset offered:** {{if any — and confirm prospect hasn't already consumed it}}
- **Walk-away offer (Touch 4):** {{referral, trial link, or final binary question}}

## Success criteria
- **Positive reply rate target:** {{realistic — 2-5% for cold; 5-15% for warm/strong-signal}}
- **When to retire:** 0% positive at N≥15 sends → retire the *signal* before rewriting copy.
- **When to scale:** above target at N≥20 → run again with 3x volume.

## Notes
{{Anything that won't fit above — caveats, segment-specific tactics, tool-specific quirks.}}
```

## Starter plays to fork

Three fully filled-in example plays live in `plays/`. They are the fastest path from zero to a running campaign: fork one, swap in the founder's own product, customer names, and signal sources, run it.

| Play file | Signal | Persona | Channel |
|---|---|---|---|
| `plays/recent-seed-fundraisers-vp-eng.md` | Company raised seed in last 60 days, 5+ engineers on LinkedIn | VP / Head of Engineering | cold email |
| `plays/show-hn-launches-ai-infra.md` | Founder posted Show HN in last 14 days in AI infra category | The Show HN founder themselves | X DM (warmer), email fallback |
| `plays/linkedin-job-change-eng-leader.md` | Someone with VP+ Eng title started a new role in last 30 days | The new eng leader | LinkedIn connect + Touch 2 message |

When a founder is designing their first play, recommend they read these first, pick the one closest to their motion, and fork it (`cp plays/{starter}.md plays/{my-version}.md`) rather than starting from a blank template.

## What this skill explicitly does NOT do

- Does not draft individual messages. That's the channel skills' job. This codifies the pattern; channel skills execute it.
- Does not run the play. Hand off to `/gtm-x-outreach`, `/gtm-linkedin-outreach`, or `/gtm-cold-email` with a prospect list.
- Does not track results. That's `/gtm-get-better`'s job, and `gtm-get-better` reads `plays/*.md` to know which plays to evaluate.

## Hypothesis backlog

When designing plays, you'll generate ideas that don't have data yet. Write them down in `plays/_backlog.md` (one line each) so you can come back when you have enough volume to test:

```
- Product-usage signal: 5+ admin actions in a single session → owner persona, X channel
- Support-ticket signal: keywords "compliance" or "audit" → security leader persona, email channel
- Hiring signal: 3+ open eng roles posted in last 30 days → VP Eng persona, LinkedIn channel
- Consolidation signal: 10+ individual seats at one company → admin persona, email channel
```

These are seeds. The `/gtm-get-better` skill can prompt you to promote one to a real play after you've gathered evidence.

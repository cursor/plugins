---
name: gtm-sales-pack
description: Interviews a founder grill-me style (one question at a time, ~25 questions total) about their company, ICP, value props, common objections, persona-specific positioning, and writing voice. Produces a structured sales-pack.md knowledge base that every other founder-gtm skill (gtm-x-outreach, gtm-linkedin-outreach, gtm-cold-email, gtm-find-prospects, gtm-get-better) reads from. PREREQUISITE for all outreach skills. Use when a founder first sets up founder-gtm, when sales-pack.md is missing or stale, when the founder says they're updating their positioning, types /gtm-sales-pack, or asks for help articulating their pitch.
---

# Sales Pack, context collection

You are interviewing an early-stage founder to build their **sales pack**: a single markdown file (`sales-pack.md`) that becomes the source of truth for every outbound message the `founder-gtm` plugin drafts. Without this file, every other skill produces generic AI slop.

## What you produce

A `sales-pack.md` file at the founder's current project root, with the exact section structure defined in the [Output template](#output-template) below. Use the template verbatim, other skills parse against these section headings.

## How to interview

This skill is an offshoot of `grill-me`. Same energy: ask one question at a time, walk the tree, recommend an answer when useful, but let the founder speak in their own words. Do not batch questions. Do not paraphrase their answers into bullet points without checking.

### Three principles

1. **One question at a time, in order.** Each question's answer informs the next. Do not show the full list up front, it overwhelms.
2. **Capture their exact words.** When they describe their product, copy their phrasing. When they describe a customer pain, write it the way they said it. The point is voice, not polish.
3. **Push for specificity.** "We help engineering teams move faster" is useless. "We help 50-engineer Series A teams ship 2x more PRs by automating code review" is usable. When you hear vague claims, ask "can you give me a specific example?" or "what number have you actually measured?".

### Modes

Offer the founder a choice at the start:

- **Full mode (~25 questions, ~20 minutes)**, recommended for first run.
- **Lightning mode (~10 questions, ~7 minutes)**, for impatient founders. Produces a usable but thinner sales-pack; flag that they should re-run full mode within a week.

## The question tree

Walk these sections in order. Within each section, ask the questions one at a time. Skip questions if the answer is already clear from prior context.

### Section 1: Company basics (4 questions)

1. **One-liner.** "In one sentence, what does your company do?" If the answer is buzzwordy, push back: "Imagine you're saying this to your mom, what does it actually do?"
2. **Stage.** "Where are you, pre-seed, seed, Series A? How many engineers/employees?"
3. **Customers today.** "Name 3 real customers you have right now. (Or 3 design partners, or 3 people who actively use it.)"
4. **What problem are you solving that wasn't being solved before?** Push for the specific gap in the market, not the generic problem space.

### Section 2: Ideal Customer Profile (5 questions)

5. **Who is the *best* customer you have today?** Name them. Why are they your best?
6. **What did they have in common before they bought?** (Stage, team size, tech stack, role of buyer, pain point trigger.)
7. **Who is *not* a good customer for you?** What are the disqualifiers? (Just as important as who *is*, saves outreach time.)
8. **What signals indicate someone is ready to buy right now?** (Just raised, just hired a CTO, just shipped X, just hit pain Y.)
9. **Personas you sell to.** List up to 3 (e.g. "VP Eng", "Founding engineer", "Head of Growth"). For each: do they have buying power, or are they an influencer?

### Section 3: Value props per persona (4 questions)

10. **For your primary persona:** What are the top 3 reasons they care? Phrase each as the outcome they get, not the feature you ship. ("Cut review time from 4 days to 4 hours" ≠ "AI-powered PR review.")
11. **Proof points.** What numbers or customer outcomes can you cite with permission? List them. (Name + metric + permission level: "Brex / 45% AI-written code / OK to name publicly".)
12. **Wedge.** What's the one thing you can claim that competitors can't?
13. **Anti-pitch.** What are you not? (e.g. "We're not a Cursor replacement, we're a layer on top." This sharpens positioning.)

### Section 4: Common objections (3 questions)

14. **What do prospects push back on most often?** List the top 5 objections in their actual words.
15. **For each objection, what's your one-line response?** Keep it tight.
16. **What objection genuinely scares you?** The one you don't have a great answer for yet. (We'll handle this honestly in messaging.)

### Section 5: Channels and what's worked (3 questions)

17. **What outbound have you tried already?** (X, LinkedIn, email, in-person events, etc.) What replied? What didn't?
18. **Where do your best customers actually hang out?** (Specific subreddits, Twitter circles, Slack communities, podcasts, conferences.)
19. **What's your unfair distribution advantage?** (An accelerator batch, a VC partner's intros, a viral tweet you wrote, your background, a community you run.) Be honest if there isn't one.

### Section 6: Voice and writing style (4 questions + 1 path picker)

**6.0 Voice path picker (ask first).** Before the writing-sample questions, ask the founder which path they want for voice collection. The order matters: Option A is preferred when available because real sent email beats curated samples for capturing the founder's actual voice.

```
Question: "How do you want to capture your writing voice?"
Options:
- A) Pull from my Gmail (recommended) — reads my last 50 to 100 sent emails, extracts patterns, redacts recipients. Read-only. Requires the founder-gtm Gmail token from /gtm-cold-email setup.
- B) Paste 2 to 3 samples manually (skips Gmail)
- C) Use defaults (generic founder voice, conservative downstream)
```

Persist the chosen path to `.gtm-state/sales-pack-voice-path.json` so re-runs do not re-ask.

**Option A: Pull from Gmail.** Check for the OAuth token at `${CURSOR_PLUGIN_ROOT}/.gtm-state/gmail-token.json`. The token scopes already include `gmail.readonly` (set by `gtm-cold-email/scripts/gmail-auth.py`). If the token is missing, tell the founder one of two things:

- If they have already run `/gtm-cold-email` setup, the token should exist; re-run `python ${CURSOR_PLUGIN_ROOT}/skills/gtm-cold-email/scripts/gmail-auth.py` to regenerate.
- If they have not run `/gtm-cold-email` setup, fall back to Option B (or set up Gmail now via the cold-email setup flow).

Run the extractor:

```bash
python ${CURSOR_PLUGIN_ROOT}/skills/gtm-sales-pack/scripts/extract-voice-from-gmail.py \
  --max-emails 100 --min-words 30 \
  --out .gtm-state/voice-profile.json
```

The script (see `scripts/extract-voice-from-gmail.py`) is read-only and idempotent. It pulls the last N sent messages, filters out auto-replies, calendar invites, and short messages (< min-words), then extracts:

- Sentence length distribution (median, p25, p75)
- Opener capitalization habit (lowercase vs sentence case ratio)
- Punctuation tics (em-dash count, ellipsis count, exclamation count, semicolon count)
- Recurring phrases (top 10 bigrams and trigrams not in a stopword list)
- Sign-off style (the line above the signature)
- Three representative excerpts (recipient names redacted to `<recipient>`)

Write the extracted profile into the sales-pack's `## Voice` section as a structured block (template below), plus the three excerpts as quoted blocks.

**Option B: Paste samples manually.** Ask question 20: "Show me 2 to 3 examples of writing you're proud of. (A tweet, a blog post, an email you sent that landed.) Link or paste them." Use them as voice samples in the `## Voice` section.

**Option C: Use defaults.** Skip questions 20 to 23. Mark `voice_source: defaults` in the sales-pack frontmatter (a comment near the top) so downstream skills know to be conservative. Use this generic profile: concise, direct, lowercase casual, no corporate jargon, no em dashes, no exclamation points.

**Then ask (regardless of path):**

21. **How would your closest friend describe how you talk?** (Dry, intense, warm, blunt, geeky, wry.)
22. **What words or phrases do you never use?** ("Synergy", "leverage", "circle back". Get the hit list.)
23. **Email or DM signature you want at the end of every message.**

### Section 7: The one thing (3 questions)

24. **If a prospect remembers exactly one thing from your outreach, what should it be?**
25. **CTA for a HIGH-signal first touch** (e.g. they just complained about your problem, just raised, asked support a buying question). What do you ask them to do? (Direct call? Live demo? Free trial signup?)
26. **CTA for a LOW-signal first touch** (e.g. they just match your persona, nothing specific happened). What do you ask? (Hint: not a meeting. Usually a piece of content or a low-commitment ask.)

Both matter. Sending a Touch 1 meeting ask to a low-signal prospect is the fastest path to a 0% reply rate.

## Skill workflow

### Step 0: Check for an existing sales-pack

```bash
if [ -f sales-pack.md ]; then
  cat sales-pack.md | head -3
fi
```

If one exists, ask the founder whether they want to **append/update** specific sections (skip questions in sections they're not updating) or **fully redo** it.

### Step 1: Pick mode

Ask the founder: full vs lightning mode. Default recommendation: full.

In lightning mode, ask only these questions: 1, 2, 3, 5, 7, 9, 10, 14, 17, 25. Ten questions, ~7 minutes.

### Step 2: Run the interview

One question at a time. After each answer:
- Reflect what you heard back in one sentence ("So your sharpest customer is X because of Y, got it.").
- If the answer was vague, ask one targeted follow-up before moving on.
- If the founder gives a long story, extract the 2 to 3 key facts and confirm before moving on.

Never show the full question list. Never batch.

### Step 3: Draft the file

Once all questions are answered, write `sales-pack.md` using the template below. Quote the founder's exact phrasing in the "How I talk" and "Value props" sections, those are the highest-leverage parts for personalized outreach.

### Step 4: Review with the founder

Show them the draft. Ask:

```
Question: "How does this read?"
Options:
- Ship it (saves the file as-is)
- One section needs more depth (loops back to that section)
- The voice section is off (re-runs section 6)
- Start over (rare — only if positioning fundamentally shifted)
```

### Step 5: Save and confirm

Save to `sales-pack.md`. Add a top-of-file note:

```markdown
> Built with /gtm-sales-pack on YYYY-MM-DD. Re-run /gtm-sales-pack to update.
> Update notes from /gtm-get-better will append at the bottom.
```

Tell the founder which skill to run next (usually `gtm-find-prospects` or their first channel skill).

## Output template

Use this exact section structure. Other skills parse against the H2 (`##`) headings.

```markdown
# Sales pack — {{Company Name}}

> Built with /gtm-sales-pack on YYYY-MM-DD. Re-run /gtm-sales-pack to update.

## One-liner

{{Founder's one-sentence description, verbatim}}

## Company

- **Stage:** {{stage}}
- **Team size:** {{size}}
- **Current customers:** {{3 named}}
- **Problem we solve that wasn't being solved:** {{founder's words}}

## ICP

- **Best customer profile:** {{verbatim description of best customer + why}}
- **Common attributes of buyers:** {{stage, team size, tech stack, buyer role, pain trigger}}
- **Disqualifiers (who NOT to sell to):** {{founder's words}}
- **Buying signals to watch for:** {{list — these become inputs to gtm-find-prospects}}

## Personas

For each persona (up to 3):

### Persona: {{Title}}

- **Buying power:** {{yes / influencer-only}}
- **Top 3 outcomes they want:** {{list, framed as outcomes not features}}
- **Sharpest hook for this persona:** {{one sentence}}

## Value props and proof points

- **Wedge (one-liner we can claim that nobody else can):** {{founder's words}}
- **Top 3 outcomes overall:** {{list}}
- **Proof points (with permission tier):**
  - {{Customer name}} — {{specific metric}} — {{public / private / NDA}}

## Anti-pitch (what we're NOT)

{{founder's words — sharpens positioning}}

## Objections

| Objection (in prospect's words) | One-line response |
|---|---|
| {{...}} | {{...}} |

**Open objection (no great answer yet):** {{the scary one — flag this when it comes up in outreach so we handle honestly}}

## Channels and prior outbound

- **What we've tried:** {{summary}}
- **What replied:** {{patterns}}
- **What didn't:** {{patterns}}
- **Where best customers actually hang out:** {{specific communities / podcasts / subreddits / X circles}}
- **Unfair distribution advantage:** {{honest answer — leave blank if none}}

## Voice, how I talk

- **Source:** {{gmail | manual | defaults}}  <!-- set by Section 6 path picker -->
- **Self-description:** {{dry / intense / warm / blunt / geeky / wry / etc.}}
- **Words and phrases I never use:** {{hit list}}

### Extracted voice profile (Option A only, written by extract-voice-from-gmail.py)

```
sample_count: {{N}}
sentence_length: median {{X}} words, p25 {{Y}}, p75 {{Z}}
opener_capitalization: lowercase {{A}}% / sentence_case {{B}}%
punctuation_tics: em_dash {{N}}, ellipsis {{N}}, exclamation {{N}}, semicolon {{N}}
recurring_phrases:
  - "{{phrase 1}}" ({{count}})
  - "{{phrase 2}}" ({{count}})
  - "{{phrase 3}}" ({{count}})
sign_off_pattern: "{{most common sign-off line}}"
```

- **Voice samples (Option A pulls 3 from Gmail, recipients redacted; Option B pastes 2 to 3 manually):**
  > {{sample 1}}

  > {{sample 2}}

  > {{sample 3}}
- **Signature for outbound:** {{exact signature block}}

## The one thing

- **What should every prospect remember:** {{single sentence}}
- **CTA for high-signal first touch:** {{verbatim, single sentence}}
- **CTA for low-signal first touch:** {{verbatim, single sentence — usually content, not a meeting}}

## Features by buyer need

Map each feature you'd mention to the buyer need it satisfies. When a prospect's signal indicates a specific need (cost control, security review, hiring scale, velocity), the channel skills will pull from the matching row.

| Buyer need | What we mention | Proof / customer (with permission tier) |
|---|---|---|
| Cost control | {{features}} | {{customer + metric}} |
| Security / compliance | {{features}} | {{customer + metric}} |
| Visibility / analytics | {{features}} | {{customer + metric}} |
| Velocity / productivity | {{features}} | {{customer + metric}} |
| Onboarding / rollout | {{features}} | {{customer + metric}} |

## Signal strength cheat sheet

Your buying signals from § ICP, ranked by strength. The gtm-cold-email and gtm-design-play skills read this to match the right CTA to the right signal.

| Signal | Strength | Detection method | Default Touch 1 CTA |
|---|---|---|---|
| {{e.g. SSO support request}} | High | Support tickets matching keywords | "Want me to set up a trial?" |
| {{e.g. Recent fundraise}} | Medium | TechCrunch RSS + LinkedIn check | "Happy to send a playbook" |
| {{e.g. Matches persona only}} | Low | Title + company match | "Thought you'd find this useful" — content only |

## Update log

<!-- gtm-get-better will append timestamped notes here -->
```

## Quality bar before you save

Before writing the file, sanity check:

- [ ] No buzzwords sneaked into the founder's value props (no "revolutionary", "game-changing")
- [ ] Every proof point has a real customer name + a real number + a permission level
- [ ] The voice section has at least one paste of the founder's actual writing (not just adjectives)
- [ ] The CTA section names exactly one CTA, not a menu
- [ ] The ICP section is specific enough that `gtm-find-prospects` could turn it into a query

If any of those fail, ask one more clarifying question before saving.

## Notes for downstream skills

Other skills read `sales-pack.md` like this:
- `gtm-find-prospects` parses the `## ICP` and `## Personas` sections to build target criteria.
- `gtm-x-outreach`, `gtm-linkedin-outreach`, `gtm-cold-email` parse `## Value props`, `## Personas`, `## Voice`, and `## The one thing` to draft messages.
- `gtm-get-better` appends notes to the `## Update log` section based on observed reply patterns.

Keep this contract stable. If you add new sections, add them after `## The one thing` and before `## Update log`.

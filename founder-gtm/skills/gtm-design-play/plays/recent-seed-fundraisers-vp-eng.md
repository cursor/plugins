# Play: recent-seed-fundraisers-vp-eng

> Designed 2026-05-27 via /gtm-design-play. Starter play, fork before running.

## Signal
**Type:** account (hybrid, with person enrichment)
**Signal:** Company closed a seed round in the last 60 days AND has at least 5 engineers listed on LinkedIn.
**Strength:** medium
**Detection:** TechCrunch venture RSS + Crunchbase free tier scan, cross-filtered against LinkedIn "Engineering" headcount via the find-prospects script. Run weekly.
**Source data:** TechCrunch funding RSS (`scripts/techcrunch-funding-rss.py`), LinkedIn company search for `current_employee_count_eng >= 5`.

## Persona
**Title pattern:** VP Engineering, Head of Engineering, Director of Engineering. At a seed-stage company this is often the first eng hire above the founders.
**Buying power:** decision-maker on tooling under $50k ARR. Influencer above that.
**Sharpest hook for this persona:** Seed-stage eng leaders are setting up the dev-tooling foundation. They are the buyer for anything that reduces the cost of going from 5 to 25 engineers.

## Channel
**Primary:** email
**Reason:** VPs of Eng at seed companies are reachable on LinkedIn but slow to respond. Email lands in their workflow inbox where they expect peer outreach. X is hit or miss for non-founder eng leaders.

## Segments
Two segments based on funding size.

### Segment A: <$3M seed (capital-conscious, founder-led tech)
**Touch 1 opener:**
```
Subject: {{Company}}'s eng setup

Saw {{Company}} closed the seed last month, congrats. The 5-to-25-engineer stretch is usually where the early tooling decisions either pay off or have to be ripped out. We have helped {{customer_1}} and {{customer_2}} get through that without rebuilding mid-Series-A.

Want me to share a short doc on what worked for them?

{{founder signature}}
```

### Segment B: $3M to $8M seed (already hiring fast)
**Touch 1 opener:**
```
Subject: {{Company}}'s next 10 engineers

Saw the {{$XM}} seed close, congrats. You are probably mid-hire on the next 5 to 10 engineers right now. We have shipped specifically for the moment where eng goes from 5 to 25 (where most tooling cracks). {{customer_1}} just got through it; happy to share what they kept and what they rebuilt.

Worth a 15-min call to compare notes?

{{founder signature}}
```

## Cadence (shared across segments)

| Touch | Day | Angle | CTA |
|---|---|---|---|
| 1 | 0 | Signal-anchored: recent seed + scaling moment | Soft (Segment A: "want a short doc?") / Direct (Segment B: "worth a 15-min call?") |
| 2 | 3 to 5 | Proof point, different angle: customer outcome with metric | "want the playbook we wrote on this?" |
| 3 | 8 to 10 | Alternative offer: 5-min Loom instead of call | "if a call is too much, would a Loom on {{X}} be useful?" |
| 4 | 14 to 18 | Clean breakup, referral ask | "all good if not a fit right now, is there someone else at {{Company}} I should reach out to?" |

## Offer ladder applied
- **Touch 1 CTA:** Segment A: content (doc). Segment B: direct ask (15-min call).
- **Asset offered:** Founder writes a 1-page "First 10 eng hires, what tooling matters" doc once, reuses across the play.
- **Walk-away offer (Touch 4):** referral ask, not pitch.

## Success criteria
- **Positive reply rate target:** 4 to 7% (seed-funded prospects are warmer than blanket cold).
- **When to retire:** 0% positive at N >= 15 sends, second cycle. Retire the *signal-persona pair*, not the copy first.
- **When to scale:** above 5% at N >= 20 sends, expand to 50 sends per week.

## Notes
- Seed-funded lists are easy to over-mine. Watch for the same company getting 100+ cold emails the same week. Move fast (within 7 days of the round being announced) or wait 30+ days.
- Do not name a customer in Touch 1 if the customer is a direct competitor of {{Company}}. Check `sales-pack.md § Proof points` for permission tiers.
- If the seed round was led by a fund the founder also has a connection at, switch to `/gtm-warm-intro` instead. Warm intros from a shared investor convert dramatically better than cold.

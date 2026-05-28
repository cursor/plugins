# Play: linkedin-job-change-eng-leader

> Designed 2026-05-27 via /gtm-design-play. Starter play, fork before running.

## Signal
**Type:** person
**Signal:** Someone with a VP+ Engineering title started a new role in the last 30 days.
**Strength:** medium
**Detection:** LinkedIn Sales Navigator alert "Posted on LinkedIn: started a new position" filtered by `title contains VP, Head, Director, CTO` AND `function: Engineering`. Without Sales Navigator: manual LinkedIn search using the "started a new job" filter (free, run weekly).
**Source data:** LinkedIn job-change alerts, or LinkedIn search results saved into a CSV per week.

## Persona
**Title pattern:** VP Engineering, Head of Engineering, Director of Engineering, CTO. Newly in role.
**Buying power:** decision-maker, though the first 60 days of a new role they are often defaulting to existing vendors and asking for evaluations from their team.
**Sharpest hook for this persona:** They are evaluating tools for the first 90 days as they assess what their predecessor left them. New eng leaders almost always rip out 1 to 3 vendors in their first quarter.

## Channel
**Primary:** LinkedIn (connection request + Touch 2 after acceptance)
**Reason:** Their LinkedIn is the most active in their career right now (congrats messages flooding in). A connection request lands at peak attention. Email is noisier with onboarding logistics.

## Segments
Two segments based on previous company size.

### Segment A: Came from a much larger company (1000+ engineers)
**Touch 1 (connection note, <= 250 chars):**
```
Hey {{firstname}}, congrats on the {{Company}} move. Going from {{previous company}} scale to a smaller team usually surfaces a stack of tooling decisions in the first 60 days. We work with a few teams in your spot. Would love to connect.
```

**Touch 2 (after acceptance, day 1 to 2 post-connect):**
```
Thanks for connecting, {{firstname}}.

The pattern we see most often when someone moves from {{previous company}} scale to a smaller team: the smaller team's tooling looks underbuilt at first, but the rip-and-replace cost is brutal until month 4 to 6. We have helped 3 teams in your spot make those decisions less expensive.

If you want, happy to send a 1-pager on what those 3 teams kept and what they replaced.

Want me to send it?

{{founder signature}}
```

### Segment B: Came from a similar-sized company or smaller (lateral or step-down)
**Touch 1 (connection note, <= 250 chars):**
```
Hey {{firstname}}, congrats on joining {{Company}}. We work with a few teams running similar stacks to what you came from. Curious how the first weeks are going. Would love to connect.
```

**Touch 2 (after acceptance, day 1 to 2 post-connect):**
```
Thanks for connecting, {{firstname}}.

Quick context on what we do: {{founder one-liner from sales-pack.md}}. The reason I reached out is that {{Company}} looks like a strong fit for the kind of team we serve best, and the first 60 days in a new role is usually when the eng leader sets the bar for what tools the team uses.

If it would help, happy to send a 2-min Loom on how {{customer with similar profile}} solved {{relevant problem}}.

Want me to send it?

{{founder signature}}
```

## Cadence (shared across segments)

| Touch | Day | Angle | CTA |
|---|---|---|---|
| 1 | 0 | LinkedIn connection request, signal-anchored | "would love to connect" (no pitch in the connect note) |
| 2 | 1 to 2 (post-acceptance) | DM with context + one specific offer | "want me to send the {{1-pager / Loom}}?" |
| 3 | 7 to 10 (post-acceptance) | Alternative angle: ask one specific question about their first 30 days | "what is the first tooling decision you are looking at?" |
| 4 | 14 to 18 (post-acceptance) | Clean breakup, peer-to-peer offer | "totally no worries if not the right time, will be around when the dust settles" |

## Offer ladder applied
- **Touch 1 CTA:** none, just the connect (acceptance is the goal).
- **Touch 2 CTA:** soft, a 1-pager or short Loom. Never a meeting on Touch 2.
- **Asset offered:** founder writes one "first 60 days as a new eng leader" doc, reuses across segments.
- **Walk-away offer (Touch 4):** soft, no pitch, keep the door open.

## Success criteria
- **Connection acceptance rate target:** 35 to 45% (job-change moments are warm).
- **Positive reply rate target (Touch 2):** 5 to 10% of acceptances.
- **When to retire:** acceptance below 25% at N >= 25 → opener needs work. 0% positive Touch 2 at N >= 20 → Touch 2 framing needs work; the play likely still has signal.
- **When to scale:** above 8% positive at N >= 20, run on every weekly LinkedIn job-change scan.

## Notes
- The 90-day window after starting a new role is the highest-leverage moment. After 90 days the prospect has already settled on vendors.
- Do not message in the first week after they started. They are in onboarding mode and inbox-flooded. Wait at least 7 days.
- If they post publicly about their first impressions of the eng stack, that is a Tier-High personalization opportunity. Reference the post directly.
- Avoid "congratulations on the new role" as the only personalization. Everyone says it. Add one specific thing from their background or the new company.
- For Sales Navigator users: the "Posted on LinkedIn" alert fires within 24 hours of the job change post. Set up the alert once; the play runs weekly off the alert output.

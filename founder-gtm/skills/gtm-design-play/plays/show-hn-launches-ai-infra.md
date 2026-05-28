# Play: show-hn-launches-ai-infra

> Designed 2026-05-27 via /gtm-design-play. Starter play, fork before running.

## Signal
**Type:** person
**Signal:** A founder posted a Show HN launch in the last 14 days in the AI infra category (LLM tooling, agent frameworks, eval, observability, fine-tuning, vector DB, RAG).
**Strength:** high
**Detection:** HN Algolia search via `scripts/hn-show-scraper.py` with category keywords. Run every 2 days during active campaign.
**Source data:** Show HN posts (Algolia `https://hn.algolia.com/api/v1/search?tags=show_hn`), filtered by category keywords.

## Persona
**Title pattern:** Founder, technical co-founder, solo builder. The person who actually wrote the post.
**Buying power:** decision-maker on their own product. Often the only person at the company.
**Sharpest hook for this persona:** They just shipped publicly and are checking HN every 5 minutes for the next 24 hours. Right time, right context.

## Channel
**Primary:** X DM (warmer, fits the "just launched" energy)
**Fallback:** email (use the address in their HN profile if present, or pattern-guess from the company domain)
**Reason:** Founders posting Show HN are usually active on X around the launch. A DM lands while they are still in launch mode. Email works as a follow-up.

## Segments
Two segments based on launch trajectory.

### Segment A: Launch is climbing the HN front page (>50 points in <12 hours)
**Touch 1 opener:**
```
hey, saw {{product}} on HN, the {{specific feature or claim}} bit landed for me. we are building {{founder one-liner}} and run into the exact {{problem area}} you are solving.

curious what you would change about the {{X}} approach if you started over today. happy to share how we have seen {{specific pattern}} work for {{customer or design partner}}.

would a quick swap of notes be useful?
```

### Segment B: Launch is quieter (<50 points, low engagement)
**Touch 1 opener:**
```
hey, caught the {{product}} Show HN. the framing on {{specific paragraph from their post}} is sharp. most launches in this space lead with the wrong wedge.

we are also in {{adjacent area}} and ran the same playbook 6 months ago. happy to share what got us our first 10 paying users if it is useful, no pitch.

want me to send the writeup?
```

## Cadence (shared across segments)

| Touch | Day | Angle | CTA |
|---|---|---|---|
| 1 | 0 to 1 (post launch) | Reference specific paragraph from their Show HN post | Segment A: swap notes (peer ask). Segment B: send the writeup (content). |
| 2 | 3 to 5 | New angle: ask about a real product question they raised in HN comments | "if you have 10 minutes, want to compare {{X}} approaches?" |
| 3 | 7 to 10 | Switch to email if no X reply. Same hook, slightly different framing. Alternative low-commitment offer (5-min Loom). | "wrote a quick Loom on {{X}}, want me to send?" |
| 4 | 14 to 18 | Clean breakup, peer-to-peer | "all good if it is not the right time, would love to swap notes once you are past launch" |

## Offer ladder applied
- **Touch 1 CTA:** swap notes (Segment A) or send writeup (Segment B). Never a meeting on Touch 1.
- **Asset offered:** the founder writes one "what we learned launching {{X}}" doc, reuses it.
- **Walk-away offer (Touch 4):** keep the door open, no guilt.

## Success criteria
- **Positive reply rate target:** 10 to 20% (Show HN launchers are unusually warm, and they care about peer feedback).
- **When to retire:** 0% positive at N >= 15 sends. Likely the founder's product is not adjacent enough to the AI infra category. Tighten the category filter.
- **When to scale:** above 12% at N >= 20 sends, run on every Show HN launch in the category, weekly.

## Notes
- Speed matters: the first 48 hours after a Show HN post is the maximum-attention window. After 7 days the post is buried and the founder has moved on.
- Do not reference HN comments that were negative or contentious unless the founder shows resilience in their reply. Reading the comment thread is part of the personalization work.
- If the founder also tweeted the launch, reference both: "saw the Show HN post + the X thread, the {{X}} angle is sharp."
- The X DM character cap is 500. The opener above runs close, leave room.
- Pattern to avoid: pitching the product in Touch 1. The launch context creates peer-to-peer expectation; pitching breaks it.

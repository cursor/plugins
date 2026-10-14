---
name: run-review-panel
description: "Called by a skill after Verify work on a high-stakes draft; reviewers advise and the person picks the changes."
---

# Run review panel

**Type:** utility skill.

A panel advises; it doesn't decide, and it never replaces [Verify work](../verify-work/SKILL.md), which still checks the facts. Reviewers advise, a separate judge merges what they say, and the person picks the changes, as [Procedure and perspective](../explain-how-it-works/references/principles.md#procedure-and-perspective) says.

## Steps

1. **Set it up** with the person: the draft, its purpose, a panel of 3 to 5 named people or roles with one marked as the decision maker, a rubric of 4 to 7 points, started from [the default rubrics](references/rubrics.md), and the sources, scoped to this one unit and found by its ID.
2. **Write a card for each reviewer** only from real, dated sources, such as their notes, messages, or comments on past work: about 10 lines, with the evidence rated strong, some, or thin. A thin card falls back to the role and says so, and a card built from the role is labeled "role-based." When a reviewer's standards are written down in a standard skill, such as a manager-review standard, load it as the core of their card. Cards are working notes, never copied into a skill.
3. **Run the reviewers:** one fresh subagent for each card, side by side, and none sees another's review. Each returns a score from 1 to 5 for each rubric point, with a reason tied to a section of the draft; its top 3 changes; the lines it would object to; what to keep; and the first question it would ask. Reviewers never rewrite the draft.
4. **Run the judge** from this bot's own turn once the reviewers return: a separate fresh subagent, neither the drafter nor a reviewer. It weighs the reviews, the decision maker first, then the strength of each card's evidence and the purpose; settles conflicts; drops any point with no source; and checks every fact a change suggests against the sources. It returns a verdict, at most 7 changes ranked with the effort each takes, a Keep list, and open questions.
5. **The person decides.** Show the verdict and the ranked changes, and ask which to make. Make only the changes they pick, through the skill that drafted it, then offer one rerun of the panel.
6. **A change to a standard.** If the review suggests changing a reviewer's written standard itself, ask the person before you edit that standard skill.

## Never

- Invent a quote or a view, or put a customer's quote into the draft.
- Let the drafter judge, or let a reviewer see another reviewer's work.
- Contact a reviewer, or share the draft with anyone.
- Use another unit's sources.
- Stand in for Verify work.

## What good looks like

- Every card says where its evidence came from and how strong it is.
- The judge's changes each trace to a reviewer's reason and a section of the draft.
- The person picked the changes, and nothing else in the draft moved.

## Team spec

<!-- team-builder-stack:begin spec team,systems -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
<!-- team-builder-stack:end spec -->

## Example

The judge's verdict on a QBR deck for Account A, with made-up names:

> **Verdict: nearly ready.** The decision maker, the customer's VP of Operations (card: strong, from three dated call notes), scores the value story 4 of 5 and the renewal ask 2 of 5.
>
> 1. **Lead the ask with the usage numbers on slide 3.** Small. Three of four reviewers, the decision maker among them.
> 2. **Drop the roadmap slide.** Small. Two reviewers object to dates the sources don't support.
> 3. **Name an owner for each next step.** Medium. The finance reviewer's card is role-based.
>
> **Keep:** the one-page summary and the support timeline. **Open:** does the customer want the pricing in this deck or after it?

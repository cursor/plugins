---
name: interrogate
description: "Use for adversarial review, multi-model review, challenging a change, or finding blind spots. Keep only failures verified against the intended behavior; do not apply fixes."
disable-model-invocation: true
---

# Interrogate

Read [the cursor adapter](../../docs/harness/cursor.md) before this skill.

Read [the shared policy](../../docs/core.md) and the current client adapter.

## Frame

Use the scope the user names; otherwise inspect the branch/working-tree diff
against its merge base. State the intent and exact input revision. Preserve
uncommitted work. Ask when a consequential requirement is unclear.

## Independent review

For requested cross-family review, resolve the two-seat review role and verify
effective model identities and read/search-only tools before launch. Respect
total and concurrent limits; sequential reviewers are valid independent passes.
Missing metadata or a seat blocks a strict panel, not a silent substitution.

Give each reviewer the same scope and intent with a separate lens. Ask for
concrete failure hypotheses, relevant source locations, the command the parent
should run, observed evidence, and the expected outcome. Reviewers do not edit,
execute shell commands, delegate, or claim a run they did not perform.
For small single-context inspection, work directly unless independent review
was explicitly required.

## Verify

The permitted parent runs the targeted repros or project checks. For a design,
use an approved scratch prototype if needed, not an edit to the reviewed code.
Keep a finding only when the evidence demonstrates a failure of the intent.
Merge shared root causes and drop disproven, stylistic, or speculative issues.
A required missing verification step is blocked, not a clean verdict.

## Output

Report intent, verified findings with exact commands/results, dropped hypotheses
and reasons, actual or unknown reviewer identities, and verification limitations.
Say "no verified findings" only for the scope and evidence actually checked.

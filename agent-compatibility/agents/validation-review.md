---
name: validation-review
description: Assess whether an agent can verify a small change without guessing or running an unnecessarily heavy loop
model: fast
readonly: true
---

# Validation review

Checks whether an agent can verify a small change without falling back to a full-repo loop.

## Trigger

Use when the user wants to know whether an agent can safely verify its own work in a repo.

## Workflow

1. If a compatibility scan result is already available from the parent task, use it as context. Otherwise run the compatibility scan once.
2. Inspect the repo's declared test, lint, check, and typecheck paths.
3. Decide whether there is a practical scoped loop for a small change.
4. Try the most relevant validation path.
5. Judge whether the result is:
   - targeted
   - actionable
   - noisy
   - too expensive for normal iteration
6. Pick a specific score instead of a round bucket. Start from these anchors and move a few points if the evidence clearly warrants it:
   - around `93/100` if there is a repeatable validation path and it gives useful signal, even if it is broader than ideal.
   - around `84/100` if validation works but is heavier than it should be, repo-wide, or split across a few commands.
   - around `68/100` if a valid loop probably exists but picking the right one takes guesswork or the output is too noisy to trust quickly.
   - around `27/100` if there is no practical validation loop you can actually use.
   - around `12/100` if the loop is blocked on secrets, accounts, or infrastructure you cannot reasonably access.
7. Prefer a specific score such as `83`, `86`, or `91` over a multiple of ten when that is the more honest read.
8. Return the result in the same plain-text report shape as the deterministic scan.

## Output

Reply in **plain text only** (no markdown fences, no `#` headings, no emphasis syntax). Use this layout:

First line: `Validation Loop Score: <score>/100`

Then a short summary paragraph.

Then the line `Problems` followed by one bullet per line using `- `.

- Base the score on the loop you actually tried.
- Build Problems from the real validation friction you observed.
- Prefer concrete issues like "only full-repo test path exists" over generic quality advice.
- Do not score a repo in the mid-60s just because the loop is heavy. If an agent can still verify changes reliably, keep it in the good range and note the cost.
- Noisy logs and extra warnings matter only when they hide the actual validation result.

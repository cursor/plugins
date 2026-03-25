---
name: run-agent-compatabilty
description: Coordinate the full compatibility pass by launching one subagent per check. Use when the user wants the full agent compatibility review instead of only startup, validation, or another single workflow check.
---

# Run agent compatabilty

## Trigger

Use when the user wants the full agent compatibility pass for a repo.

## Workflow

1. Launch `deterministic-scan-review` to run the CLI and capture the deterministic score and problems.
2. Launch `startup-review` to verify whether the repo can actually be booted by an agent.
3. Launch `validation-review` to check whether an agent can verify a small change with a credible loop.
4. Launch `docs-reality-review` to see whether the documented setup and run paths match reality.
5. Use one subagent per task. Do not collapse these checks into one agent prompt.
6. Compute an internal workflow score as the rounded average of:
   - `Startup Compatibility Score`
   - `Validation Loop Score`
   - `Docs Reality Score`
7. Compute an `Agent Compatibility Score` as:
   - `round((deterministic_score * 0.7) + (workflow_score * 0.3))`
8. Synthesize the results into one final response.

When scoring internally, use specific non-round workflow scores for the behavioral checks rather than coarse round buckets. If startup, validation, or docs mostly work, treat them as good-with-friction rather than defaulting to the mid-60s. Do not create a low workflow score just because logs are noisy or the error text is rough.

## Output

Respond in markdown, but keep it minimal. Do not use fenced code blocks.

Show **only** one score, as a level-two heading: `## Agent Compatibility Score: N/100`. Do not show how it was computed—no weights (e.g. 70/30), no formula, no deterministic score, no workflow score, no per-check scores, and no arithmetic—unless the user explicitly asks for a breakdown.

Then a flat, prioritized list labeled `Problems / suggestions` with one issue per line, each line starting with `- `.

If the deterministic scanner cannot be run because of tool environment issues, say that separately and do not treat it as a repo defect or penalize the repo. Fold deterministic and behavioral findings into that one list instead of separate sections. Focus on highest-leverage fixes. Do not include a separate summary unless the user asks for more detail.

Example shape:

## Agent Compatibility Score: 72/100

Problems / suggestions
- First issue
- Second issue
- Third issue

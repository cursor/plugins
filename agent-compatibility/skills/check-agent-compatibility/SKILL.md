---
name: check-agent-compatibility
description: Run the full repository compatibility pass: scanner score, startup path, validation loop, and docs reliability.
---

# Check agent compatibility

## Trigger

Use when the user wants the full compatibility pass for a repo.

## Workflow

1. Launch `compatibility-scan-review` to run the CLI and capture the raw repository score and main issues.
2. Launch `startup-review` to verify whether the repo can actually be booted by an agent.
3. Launch `validation-review` to check whether an agent can verify a small change without an unnecessarily heavy loop.
4. Launch `docs-reliability-review` to see whether the documented setup and run paths reliably match reality.
5. Use one subagent per task. Do not collapse these checks into one agent prompt.
6. Compute an internal workflow score as the rounded average of:
   - `Startup Compatibility Score`
   - `Validation Loop Score`
   - `Docs Reliability Score`
7. Compute an `Agent Compatibility Score` as:
   - `round((deterministic_score * 0.7) + (workflow_score * 0.3))`
8. Synthesize the results into one final response.

When scoring internally, use specific non-round workflow scores for the behavioral checks rather than coarse round buckets. If startup, validation, or docs mostly work, treat them as good-with-friction rather than defaulting to the mid-60s. Do not create a low workflow score just because logs are noisy or the error text is rough.

## Output

Respond in markdown, but keep it minimal. Do not use fenced code blocks.

Show only one score, as a level-two heading: `## Agent Compatibility Score: N/100`. Do not show how it was computed, including weights, formula, deterministic score, workflow score, per-check scores, or arithmetic, unless the user explicitly asks for a breakdown.

Then a flat, prioritized list labeled `Top fixes` with one issue per line, each line starting with `- `.

If the deterministic scanner cannot be run because of tool environment issues, say that separately and do not treat it as a repo defect or penalize the repo. Fold deterministic and behavioral findings into that one list instead of separate sections. Focus on the fixes that would most improve real agent workflows. Do not include a separate summary unless the user asks for more detail.

Example shape:

## Agent Compatibility Score: 72/100

Top fixes
- First issue
- Second issue
- Third issue

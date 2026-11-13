---
name: fix-ci
description: "Find failing pull request checks, inspect logs or external check links, and apply focused fixes. When a check excerpt or shared pull request context already names the failing paths, fix from that evidence. Reserve a parallel investigator per check for ambiguous or multi-root failures."
---

# Fix CI

## Trigger

Branch or PR CI is failing and needs a fast, iterative path to green checks.

## Workflow

1. Resolve the active PR and inspect `gh pr checks --json name,bucket,state,workflow,link`.
2. Inspect failed jobs and extract the first actionable error. Use GitHub Actions logs when available; otherwise use the check link to identify the failing command or service.
3. Apply the smallest safe fix.
4. Push, re-check the PR check set, and repeat until green.

## Guardrails

- Fix one actionable failure at a time.
- Prefer minimal, low-risk changes before broader refactors.
- Keep `gh pr checks` as the source of truth for overall PR CI state.
- When the check excerpt already names the failing files, fix from that excerpt. Spawn one investigator per check only when the failure is ambiguous or has more than one root.

## Output

- Primary failing job and root error
- Fixes applied in iteration order
- Current CI status and next action

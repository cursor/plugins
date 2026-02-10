---
name: loop-on-ci
description: Watch CI runs and iterate on failures until all checks pass
---

# Skill: Loop on CI

Watch CI for the current branch and keep fixing failures until green.

## Workflow

1. Find the current branch and latest workflow run.
2. Wait for CI completion with `gh run watch --exit-status`.
3. If failed, inspect failed logs, implement a focused fix, commit, and push.
4. Repeat until all required checks pass.

## Commands

```bash
# Latest run for current branch
gh run list --branch "$(git branch --show-current)" --limit 5

# Block until completion (0 on pass, non-zero on fail)
gh run watch --exit-status

# Inspect failed jobs
gh run view <run-id> --log-failed
```

## Guardrails

- Keep each fix scoped to a single failure cause when possible.
- Do not bypass hooks (`--no-verify`) to force progress.
- If failures are flaky, retry once and report flake evidence.

## Output

- Current CI status
- Failure summary and fixes applied
- PR URL once checks are green

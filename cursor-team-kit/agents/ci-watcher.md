---
name: ci-watcher
description: Watch PR CI for the current branch and report pass/fail with relevant failure links. Use when waiting for CI results or CI has failed. Use proactively to monitor branch CI.
model: fast
is_background: true
---

# CI watcher

CI monitoring specialist for PR-attached checks.

## Trigger

Use when waiting for CI results, CI has failed, or when proactively monitoring branch CI.

## Workflow

1. Determine current branch: `git branch --show-current`
2. Resolve the PR: `gh pr view --json number,url,headRefName`
3. Inspect attached checks: `gh pr checks --json name,bucket,state,workflow,link`
4. If checks are pending, watch: `gh pr checks --watch --fail-fast`
5. If a GitHub Actions check failed, fetch that job's log with `gh api "repos/{owner}/{repo}/actions/jobs/<job-id>/logs"`, taking `<job-id>` from the end of the check link. `gh run view <run-id> --log-failed` refuses until every job in the run has finished, so only use it once the run is complete. For other checks, return the check link and concise next step.

## Output

- CI status (passed/failed)
- PR and check metadata
- If failed: concise failure excerpt or external check link and likely next step

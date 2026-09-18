---
name: startup-review
description: Bootstrap and start a repository in an isolated copy, then score the observed cold-start path.
model: fast
readonly: false
---

# Startup review

Measure whether a cold agent can reach the repository's documented first success.

## Safety boundary

- Create a dedicated temporary copy outside `Target root`; never share it with another review. If isolation is unavailable, do not run a command that could modify tracked files.
- Do not run deploy, release, publish, migration, destructive reset, or external data-write commands.
- Do not run paid or live tests, or anything documented as costing money.
- Do not request or use production credentials. Treat missing secrets or accounts as observed startup friction.
- Do not modify tracked files. Record any untracked build output or dependency directories created by the startup path.
- Stop processes you start and do not leave ports or services running.

## Workflow

1. Require `Target root`, `Deterministic scan result`, `Time budget`, `Allowed mutations`, and `Required evidence` from the parent.
2. Create and canonicalize a dedicated `executionRoot` copy outside `Target root`. Record `isolation` as `isolated-copy`; never run stateful commands in `Target root`.
3. Capture the starting `git status --short` in the isolated copy when the target is a Git checkout.
4. Read the README, scripts, toolchain files, environment examples, and workflow docs.
5. Pick the most likely documented bootstrap and startup path. Run it within the supplied time budget.
6. Permit one recovery attempt when the first path fails. Record every inferred step.
7. Verify the success condition implied by the docs. Do not require HTTP when the documented runtime is not an HTTP service.
8. Compare final tracked-file status with the starting status. A startup command that unexpectedly changes tracked files is a problem.
9. Return status `complete` when the review produced a defensible score, including a low score caused by inaccessible secrets or infrastructure. Use `unavailable` only for a tool or environment failure that prevents evaluation; in that case use `null` for `executionRoot` and `unavailable` for `isolation` if no copy was created.

## Scoring anchors

- About `93`: the main path works within budget with only ordinary prerequisites.
- About `84`: it works after limited digging or one recovery step.
- About `68`: a credible path exists but remains manual, ambiguous, or expensive.
- About `27`: no credible path works from the repository and docs.
- About `12`: the path is blocked on secrets, accounts, or inaccessible infrastructure.

Choose a specific score supported by the evidence.

## Output

Return JSON only, with no markdown fence:

Allowed `status` values are `complete` and `unavailable`. Allowed command `outcome` values are `passed`, `failed`, and `blocked`.

```json
{
  "status": "complete",
  "scoreName": "Startup Compatibility Score",
  "score": 84,
  "targetRoot": "/absolute/target/path",
  "executionRoot": "/temporary/isolated/copy",
  "isolation": "isolated-copy",
  "summary": "Short evidence-based summary.",
  "evidence": ["npm run dev reached the documented success condition"],
  "problems": [
    {
      "title": "Problem title",
      "evidence": ["command outcome or file:line"],
      "remediation": "Concrete fix"
    }
  ],
  "commands": [
    {
      "command": "documented command",
      "outcome": "passed",
      "evidence": "short observed result"
    }
  ]
}
```

Always return `targetRoot`, `summary`, and at least one `evidence` string. Use `null` for `score` only when status is `unavailable`.

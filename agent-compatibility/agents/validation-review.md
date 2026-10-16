---
name: validation-review
description: Run the narrowest credible validation loop in an isolated copy and score its usefulness for small changes.
model: fast
readonly: false
---

# Validation review

Measure whether an agent can verify a small change without guessing or defaulting to an unnecessarily heavy loop.

## Safety boundary

- Create a dedicated temporary copy outside `Target root`; never share it with another review. If isolation is unavailable, do not run a command that could modify tracked files.
- Do not run deploy, release, publish, migration, destructive reset, or external data-write commands.
- Do not run paid or live tests, or anything documented as costing money.
- Do not request or use production credentials.
- Do not modify tracked files. Record generated files, caches, dependency directories, and other untracked output.

## Workflow

1. Require `Target root`, `Deterministic scan result`, `Time budget`, `Allowed mutations`, and `Required evidence` from the parent.
2. Create and canonicalize a dedicated `executionRoot` copy outside `Target root`. Record `isolation` as `isolated-copy`; never run stateful commands in `Target root`.
3. Capture the starting `git status --short` in the isolated copy when the target is a Git checkout.
4. Inspect declared test, lint, format-check, typecheck, and task-runner paths.
5. Choose the narrowest representative validation command for a small change. Prefer a documented file, package, or test target over a full-repository suite.
6. Run the command within the supplied time budget and assess whether the result is targeted, actionable, trustworthy, and affordable for normal iteration.
7. If no scoped command exists, run the lightest credible broader check and record the extra cost as friction.
8. Compare final tracked-file status with the starting status. Unexpected tracked-file changes are a problem.
9. Return status `complete` when the review produced a defensible score. Use `unavailable` only for a tool or environment failure that prevents evaluation; in that case use `null` for `executionRoot` and `unavailable` for `isolation` if no copy was created.

## Scoring anchors

- About `93`: a repeatable scoped loop gives useful signal.
- About `84`: validation is reliable but broader or more fragmented than ideal.
- About `68`: the loop exists but selection or output requires material guesswork.
- About `27`: no practical validation loop can be run.
- About `12`: validation depends on secrets, accounts, or inaccessible infrastructure.

Choose a specific score supported by the evidence.

## Output

Return JSON only, with no markdown fence:

Allowed `status` values are `complete` and `unavailable`. Allowed command `outcome` values are `passed`, `failed`, and `blocked`.

```json
{
  "status": "complete",
  "scoreName": "Validation Loop Score",
  "score": 84,
  "targetRoot": "/absolute/target/path",
  "executionRoot": "/temporary/isolated/copy",
  "isolation": "isolated-copy",
  "summary": "Short evidence-based summary.",
  "evidence": ["targeted test command passed"],
  "problems": [
    {
      "title": "Problem title",
      "evidence": ["command outcome or file:line"],
      "remediation": "Concrete fix"
    }
  ],
  "commands": [
    {
      "command": "validation command",
      "outcome": "passed",
      "evidence": "short observed result"
    }
  ]
}
```

Always return `targetRoot`, `summary`, and at least one `evidence` string. Use `null` for `score` only when status is `unavailable`.

---
name: docs-reliability-review
description: Check whether documented setup, run, and validation paths match the repository's real interfaces.
model: fast
readonly: true
---

# Docs reliability review

Measure whether a cold agent can trust the written setup and workflow guidance.

## Workflow

1. Require `Target root`, `Deterministic scan result`, `Time budget`, `Allowed mutations`, and `Required evidence` from the parent.
2. Read the README, setup and environment docs, contribution guidance, agent instructions, manifests, and root task definitions.
3. Trace documented install, run, and validation commands to their real scripts or targets without changing repository state.
4. Use the passed deterministic result as context. Do not install or rerun the scanner.
5. Record exact mismatches, missing prerequisites, stale names, unsupported claims, and commands with no real target.
6. Score the damage caused by drift. Minor wording differences should not drag an otherwise reliable path into the midrange.
7. Return status `complete` when the review produced a defensible score. Use `unavailable` only when the target or required files cannot be inspected.

## Scoring anchors

- About `93`: docs lead to the working path with little or no correction.
- About `84`: limited drift exists, but recovery takes little guesswork.
- About `68`: important steps must be reconstructed from the tree or CI.
- About `27`: docs point down the wrong path or omit required steps.
- About `12`: the real path depends on unavailable private context.

Choose a specific score supported by file references.

## Output

Return JSON only, with no markdown fence:

Allowed `status` values are `complete` and `unavailable`.

```json
{
  "status": "complete",
  "scoreName": "Docs Reliability Score",
  "score": 84,
  "targetRoot": "/absolute/target/path",
  "summary": "Short evidence-based summary.",
  "evidence": ["README.md:20 maps to package.json#scripts.test"],
  "problems": [
    {
      "title": "Problem title",
      "evidence": ["file:line"],
      "remediation": "Concrete fix"
    }
  ],
  "commands": []
}
```

Always return `targetRoot`, `summary`, and at least one `evidence` string. Use `null` for `score` only when status is `unavailable`.

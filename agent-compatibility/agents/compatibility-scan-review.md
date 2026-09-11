---
name: compatibility-scan-review
description: Run the pinned agent-compatibility CLI, validate its repository classification, and return structured evidence.
model: fast
readonly: false
---

# Compatibility scan review

Run the deterministic scanner without modifying the target repository.

## Workflow

1. Require canonical absolute `Target root` and `Scanner helper` paths from the parent task.
2. Confirm `Scanner helper` ends in `scripts/run-deterministic-scan.mjs`, then run `node "<Scanner helper>" "<Target root>"` exactly once. The helper runs `agent-compatibility@0.1.7`, validates the scanned path, and checks the scanner classification against obvious repository signals.
3. Return the helper's JSON exactly. Do not reinterpret its score, classification, reliability, command outcomes, or failure status.
4. If the helper process exits nonzero but emits valid JSON, return that JSON; `unavailable` is evidence about the tool or environment, not a repository score of zero.
5. If the helper cannot be read or emits invalid JSON, return `unavailable` using the schema below. Do not run the scanner directly or substitute a different package version.
6. Do not make startup, validation-loop, or docs-reliability judgments.

Npm cache writes are allowed. Do not change files in the target repository.

## Output

Return JSON only, with no markdown fence:

Allowed `status` values are `complete`, `unreliable`, and `unavailable`. Allowed command `outcome` values are `passed`, `failed`, and `blocked`.
An obviously wrong classification is returned as `"unreliable"`, with the scanner's evidence preserved.

```json
{
  "status": "complete",
  "scoreName": "Deterministic Compatibility Score",
  "score": 84,
  "scannerVersion": "0.1.7",
  "targetRoot": "/absolute/path",
  "scannedPath": "/absolute/path",
  "classification": "application",
  "classificationReliable": true,
  "summary": "Short evidence-based summary.",
  "evidence": ["scannerVersion: 0.1.7", "scannedPath: /absolute/path"],
  "problems": [
    {
      "title": "Problem title",
      "evidence": ["file:line or scanner evidence"],
      "remediation": "Concrete fix"
    }
  ],
  "commands": [
    {
      "command": "npx -y agent-compatibility@0.1.7 --json <target>",
      "outcome": "passed"
    }
  ]
}
```

Always return `targetRoot`, `summary`, and at least one `evidence` string. Use `null` for `score`, `scannerVersion`, or `classification` when unavailable. Use an empty `problems` array when no meaningful deterministic problem exists.

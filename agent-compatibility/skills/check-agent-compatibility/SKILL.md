---
name: check-agent-compatibility
description: Run an evidence-backed repository compatibility pass across deterministic signals, startup, validation, and docs reliability.
---

# Check agent compatibility

## Trigger

Use when the user wants the full agent-compatibility review for a repository.

## Workflow

1. Resolve the requested repository to one canonical absolute `Target root`. Use that same path for every task. Resolve `Skill root` as the directory containing this `SKILL.md`; helper paths below are relative to that directory.
2. Launch `compatibility-scan-review` first. Its task prompt must contain:
   - `Target root`: the canonical path.
   - `Scanner helper`: `<Skill root>/scripts/run-deterministic-scan.mjs`.
   - `Deterministic scan result`: `not available yet`.
   - `Time budget`: 3 minutes.
   - `Allowed mutations`: npm cache writes needed to run the pinned scanner; no target-repository changes.
   - `Required evidence`: the scanner helper's complete JSON result.
3. Validate the returned JSON and retry the same subagent once if it is malformed or misses a required field. Preserve `unreliable` and `unavailable` as real statuses.
4. Launch `startup-review`, `validation-review`, and `docs-reliability-review` in parallel, one subagent per task. Require startup and validation to create separate temporary project copies outside `Target root`. Every task prompt must contain:
   - `Target root`: the same canonical path.
   - `Deterministic scan result`: the complete scan JSON, including status and classification reliability.
   - `Time budget`: 10 minutes for startup, 8 minutes for validation, and 5 minutes for docs.
   - `Allowed mutations`: isolated-checkout writes only for startup and validation; none for docs. Never allow deploys, paid tests, production credentials, migrations, or external data changes.
   - `Required evidence`: exact `targetRoot`, commands attempted and outcomes, file references, observed friction, and reasons for the score. Startup and validation must also return canonical `executionRoot` and `isolation` provenance.
5. Validate each returned JSON and retry malformed output once. A tool or environment failure is `unavailable`; never convert it to a repository score of zero.
6. Create a JSON object with exactly four top-level fields: `deterministic`, `startup`, `validation`, and `docs`. Each value is the corresponding complete specialist result. Write it to a temporary file outside `Target root`.
7. Run `node "<Skill root>/scripts/synthesize-results.mjs" "<temporary-results-file>"`, then remove the temporary file. Use the synthesizer output exactly for score availability, component scores, statuses, and arithmetic. If the helper rejects the results, retry the malformed specialist once; if validation still fails, report no aggregate score.
8. You must not compute the 70/30 blend yourself or substitute a different formula. With an unusable deterministic result and three usable workflow lanes, the synthesizer returns degraded workflow-only evidence. When any workflow lane is unavailable, it returns no aggregate score; do not impute its score.
9. Prioritize only fixes backed by the returned evidence. Deduplicate overlapping problems and prefer fixes that improve more than one lane.

Use specific workflow scores rather than coarse buckets. Ordinary prerequisites and noisy logs are friction, not failure, unless they prevent the documented path from working.

## Output

Keep the default response compact.

When all four results are usable:

```text
## Agent Compatibility Score: N/100

Top fixes
- First evidence-backed fix
- Second evidence-backed fix
```

When the deterministic scan is unavailable or its classification is unreliable:

```text
## Agent Compatibility Score: unavailable

## Workflow Compatibility Score: N/100

The deterministic score was not used: <short reason>.

Top fixes
- First evidence-backed fix
- Second evidence-backed fix
```

If any workflow lane is unavailable, report `## Agent Compatibility Score: unavailable`, omit `Workflow Compatibility Score: N/100`, name the unavailable lane, and do not impute its score.

Render the score headings from the synthesizer output. Show scanner version, component scores, statuses, arithmetic, and supporting evidence only when the user asks for a breakdown.

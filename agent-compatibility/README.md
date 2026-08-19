# Agent Compatibility

Cursor plugin for checking how well a repository holds up under agent workflows. It combines a pinned deterministic scanner with observed startup, validation, and docs-reliability reviews.

The default result is one score and a short list of evidence-backed fixes. Ask for a breakdown to see component scores, commands, scanner version, and file references.

## What it includes

- `check-agent-compatibility`: orchestrates the full pass
- `compatibility-scan-review`: runs and validates the deterministic scan
- `startup-review`: tests cold bootstrap and startup in an isolated copy
- `validation-review`: tests the narrowest credible verification loop in an isolated copy
- `docs-reliability-review`: checks docs against repository interfaces without changing state

## Reliability model

The full pass uses one target root throughout:

1. Run the pinned scanner through an executable guard that verifies its version, scanned path, output shape, and repository classification.
2. Run startup, validation, and docs reviews in parallel with the scanner result as context.
3. Require structured results with a matching canonical target, command outcomes, file evidence, and isolated execution provenance from every stateful specialist.
4. Retry malformed specialist output once instead of guessing missing values.
5. Pass the four lane results through an executable synthesizer that validates states and owns all score arithmetic.
6. Refuse to compute the blended score when the deterministic scan is unavailable or its classification conflicts with obvious repository signals.

Startup and validation use writable isolated copies because install, build, test, and start commands often create state. They must not deploy, publish, migrate data, use production credentials, or run paid or live tests. The docs review remains read-only.

## Score model

- `Agent Compatibility Score`: final blended score
- `Deterministic Compatibility Score`: raw score from the pinned CLI
- `Startup Compatibility Score`: observed cold-start friction
- `Validation Loop Score`: observed small-change verification quality
- `Docs Reliability Score`: documented paths compared with real repository interfaces

When every component is usable:

```text
workflow = round((startup + validation + docs) / 3)
Agent Compatibility Score = round((deterministic * 0.7) + (workflow * 0.3))
```

If the deterministic scan is unavailable or its classification is unreliable, the plugin reports `Agent Compatibility Score: unavailable` and shows a clearly labeled workflow-only score. It never invents the missing deterministic value or silently changes the weighting.

The scanner's accelerator layer informs recommendations but does not inflate the deterministic score.

## How to use it

Use `check-agent-compatibility` for the full pass. A successful result stays compact:

```md
## Agent Compatibility Score: 72/100

Top fixes

- First issue
- Second issue
```

## CLI notes

Plugin version 1.1.0 pins scanner version 0.1.7. Updating the scanner requires a plugin version change and contract-test update.

The plugin invokes the scanner through `skills/check-agent-compatibility/scripts/run-deterministic-scan.mjs`; direct commands below are for manual inspection. It computes final scores with `scripts/synthesize-results.mjs`, which fails closed on malformed or inconsistent lane results.

Default scan:

```bash
npx -y agent-compatibility@0.1.7 .
```

JSON output:

```bash
npx -y agent-compatibility@0.1.7 --json .
```

Markdown output:

```bash
npx -y agent-compatibility@0.1.7 --md .
```

Plain-text output:

```bash
npx -y agent-compatibility@0.1.7 --text .
```

Config override for ignored paths or check weights:

```bash
npx -y agent-compatibility@0.1.7 . --config ./agent-compatibility.config.json
```

The scanner is heuristic. It scores repository signals and surfaces likely friction; it is not a general code-quality verdict.

## Validate the plugin

Run the contract suite from the marketplace repository root:

```bash
node --test agent-compatibility/test/*.test.mjs
```

The suite checks execution permissions, scanner pinning, executable guard fixtures, fail-closed score synthesis, degraded scoring, subagent handoffs, structured output, classification safeguards, side-effect boundaries, and CI coverage.

## Local install

Symlink this directory into:

```bash
~/.cursor/plugins/local/agent-compatibility
```

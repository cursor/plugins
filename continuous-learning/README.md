# Continuous Learning

Automatically and incrementally keeps `AGENTS.md` up to date from transcript changes.

The plugin combines:

- A `stop` hook that decides when to trigger learning.
- A `continuous-learning` skill that mines only high-signal transcript deltas.

It is designed to avoid noisy rewrites by:

- Reading existing `AGENTS.md` first and updating matching bullets in place.
- Processing only new or changed transcript files.
- Writing plain bullet points only (no evidence/confidence metadata).

## Installation

```bash
/add-plugin continuous-learning
```

## How it works

On eligible `stop` events, the hook may emit a `followup_message` that asks the agent to run the `continuous-learning` skill.

The hook keeps local runtime state in:

- `.cursor/hooks/state/continuous-learning.json` (cadence state)

The skill uses an incremental transcript index at:

- `.cursor/hooks/state/continuous-learning-index.json`

## Trigger cadence

Default cadence:

- minimum 10 completed turns
- minimum 120 minutes since the last run
- transcript mtime must advance since the previous run

Trial mode defaults (enabled in this plugin hook config):

- minimum 3 completed turns
- minimum 15 minutes
- automatically expires after 24 hours, then falls back to default cadence

## Optional env overrides

- `CONTINUOUS_LEARNING_MIN_TURNS`
- `CONTINUOUS_LEARNING_MIN_MINUTES`
- `CONTINUOUS_LEARNING_TRIAL_MODE`
- `CONTINUOUS_LEARNING_TRIAL_MIN_TURNS`
- `CONTINUOUS_LEARNING_TRIAL_MIN_MINUTES`
- `CONTINUOUS_LEARNING_TRIAL_DURATION_MINUTES`

## Output format in AGENTS.md

The skill writes only:

- `## Learned User Preferences`
- `## Learned Workspace Facts`

Each item is a plain bullet point.

## License

MIT

# Continual Learning

Automatically and incrementally keeps `AGENTS.md` up to date from transcript changes.

The plugin combines:

- A `stop` hook that decides when to trigger learning.
- A `continual-learning` skill that orchestrates the learning flow.
- An `agents-memory-updater` subagent that mines new or changed transcripts and updates `AGENTS.md`.

It is designed to avoid noisy rewrites by:

- Reading existing `AGENTS.md` first and updating matching bullets in place.
- Processing only new or changed transcript files.
- Writing plain bullet points only (no evidence/confidence metadata).

## Installation

```bash
/add-plugin continual-learning
```

## How it works

On eligible `stop` events, the hook prefers launching the `agent` CLI in print mode when `agent` is available on `PATH`. If the CLI is unavailable or cannot be started, the hook falls back to emitting a `followup_message` that asks the current session to run the `continual-learning` skill.

The skill is marked `disable-model-invocation: true`, so it will not be auto-selected during normal model invocation. When it does run, it delegates the full memory update flow to `agents-memory-updater`.

The hook keeps local runtime state in:

- `.cursor/hooks/state/continual-learning.json` (cadence state)
- `.cursor/hooks/state/continual-learning-agent.log` (best-effort `agent` CLI output when launched from the hook)

The updater uses an incremental transcript index at:

- `.cursor/hooks/state/continual-learning-index.json`

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

- `CONTINUAL_LEARNING_MIN_TURNS` (or legacy `CONTINUOUS_LEARNING_MIN_TURNS`)
- `CONTINUAL_LEARNING_MIN_MINUTES` (or legacy `CONTINUOUS_LEARNING_MIN_MINUTES`)
- `CONTINUAL_LEARNING_TRIAL_MODE` (or legacy `CONTINUOUS_LEARNING_TRIAL_MODE`)
- `CONTINUAL_LEARNING_TRIAL_MIN_TURNS` (or legacy `CONTINUOUS_LEARNING_TRIAL_MIN_TURNS`)
- `CONTINUAL_LEARNING_TRIAL_MIN_MINUTES` (or legacy `CONTINUOUS_LEARNING_TRIAL_MIN_MINUTES`)
- `CONTINUAL_LEARNING_TRIAL_DURATION_MINUTES` (or legacy `CONTINUOUS_LEARNING_TRIAL_DURATION_MINUTES`)

## Output format in AGENTS.md

The memory updater writes only:

- `## Learned User Preferences`
- `## Learned Workspace Facts`

Each item is a plain bullet point.

## License

MIT

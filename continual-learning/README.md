# Continual Learning

Automatically and incrementally keeps `AGENTS.md` up to date from transcript changes.

The plugin combines:

- A `stop` hook that decides when to trigger learning.
- A `continual-learning` skill that mines only high-signal transcript deltas.

It is designed to avoid noisy rewrites by:

- Reading existing `AGENTS.md` first and updating matching bullets in place.
- Processing only new or changed transcript files.
- Writing plain bullet points only (no evidence/confidence metadata).

## Installation

- Deeplink: [`/plugin/add?id=continual-learning`](/plugin/add?id=continual-learning)
- Slash command: `/add-plugin continual-learning`

## How it works

On eligible `stop` events, the hook may emit a `followup_message` that asks the agent to run the `continual-learning` skill.

The hook keeps local runtime state in:

- `.cursor/hooks/state/continual-learning.json` (cadence state)

The skill uses an incremental transcript index at:

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

The skill writes only:

- `## Learned User Preferences`
- `## Learned Workspace Facts`

Each item is a plain bullet point.

## License

MIT

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

On eligible `stop` events, the hook may emit a `followup_message` that asks the agent to run the `continual-learning` skill.

The skill is marked `disable-model-invocation: true`, so it will not be auto-selected during normal model invocation. When it does run, it delegates the full memory update flow to `agents-memory-updater`.

The hook keeps local runtime state in:

- `.cursor/hooks/state/continual-learning.json` (cadence state)

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

## Exclude workspaces

Create `~/.cursor/continual-learning.json` to disable learning in selected local
directories, independently of the plugin cache:

```json
{
  "excludedPaths": ["/absolute/path/to/private-repos"]
}
```

Each absolute path excludes that directory and its descendants. Symlink aliases
are resolved, and sibling names sharing a prefix do not match. Listed directories
must exist. Set `CONTINUAL_LEARNING_CONFIG` to use a different config file.

The stop hook checks exclusions before changing cadence state or triggering a
memory update. For manual updates, invoke the `continual-learning` skill so it
can pass the installed helper path and workspace to the updater. The updater
checks the same exclusions before reading transcripts or changing memory. An unreadable or
invalid config stops learning and reports an error; a missing file keeps existing
behavior. These settings do not change cadence or the memory filename, and do not
match Git remote owners or repository slugs.

Run the focused tests with `bun test continual-learning/hooks/workspace-exclusions.test.ts`.

## Output format in AGENTS.md

The memory updater writes only:

- `## Learned User Preferences`
- `## Learned Workspace Facts`

Each item is a plain bullet point.

## License

MIT

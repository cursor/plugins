# Continual Learning (team-safe fork)

Automatically and incrementally keeps a **user-scoped** memory file up to date
from transcript changes. Safe to enable in team repos that already have a
tracked `AGENTS.md`.

Default write target:

```text
~/.cursor/projects/<slug>/AGENTS.local.md
```

`<slug>` is the absolute workspace path with the leading `/` stripped and `/`
replaced by `-` (same layout as `agent-transcripts/`).

The plugin combines:

- A `stop` hook that decides when to trigger learning and embeds absolute
  memory/index paths in the followup.
- A `continual-learning` skill that orchestrates the learning flow.
- An `agents-memory-updater` subagent that mines new or changed transcripts
  and updates `AGENTS.local.md`.
- A `preToolUse` hook that denies Write/StrReplace of `## Learned *` sections
  into a repo-tracked `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`.

It is designed to avoid noisy rewrites by:

- Reading the existing memory file first and updating matching bullets in place.
- Processing only new or changed transcript files.
- Writing plain bullet points only (no evidence/confidence metadata).

## Why this fork

Upstream marketplace still writes the workspace `AGENTS.md`. That conflicts
with a team-owned `AGENTS.md` and has leaked personal bullets into git.
[cursor/plugins#74](https://github.com/cursor/plugins/pull/74) proposes the
same default path; this fork also hard-blocks repo writes and keeps the
existing `## Learned Workspace Facts` heading (no `(local)` rename).

Disable the marketplace Continual Learning plugin while this local copy is
enabled, or both `stop` hooks will fire.

## Trigger cadence

Default cadence:

- minimum 10 completed turns
- minimum 120 minutes since the last run
- transcript mtime must advance since the previous run

Trial mode defaults (enabled in this plugin hook config):

- minimum 3 completed turns
- minimum 15 minutes
- automatically expires after 24 hours, then falls back to default cadence

## Configuration (all optional)

**Memory targets**

- `CONTINUAL_LEARNING_USER_FILE` — personal memory file. Default:
  `~/.cursor/projects/<slug>/AGENTS.local.md`.
- `CONTINUAL_LEARNING_WORKSPACE_FILE` — opt-in shared file inside the repo.
  Unset by default. Refused when the path is in git and not gitignored,
  unless `CONTINUAL_LEARNING_ALLOW_SHARED=1`.
- `CONTINUAL_LEARNING_STATE_DIR` — `cadence.json` + `index.json`. Default:
  `~/.cursor/projects/<slug>/continual-learning/`.
- `CONTINUAL_LEARNING_ALLOW_SHARED` — bypass the git-leak check.

**Cadence** (unchanged)

- `CONTINUAL_LEARNING_MIN_TURNS` (or legacy `CONTINUOUS_LEARNING_MIN_TURNS`)
- `CONTINUAL_LEARNING_MIN_MINUTES` (or legacy `CONTINUOUS_LEARNING_MIN_MINUTES`)
- `CONTINUAL_LEARNING_TRIAL_MODE` (or legacy `CONTINUOUS_LEARNING_TRIAL_MODE`)
- `CONTINUAL_LEARNING_TRIAL_MIN_TURNS` (or legacy `CONTINUOUS_LEARNING_TRIAL_MIN_TURNS`)
- `CONTINUAL_LEARNING_TRIAL_MIN_MINUTES` (or legacy `CONTINUOUS_LEARNING_TRIAL_MIN_MINUTES`)
- `CONTINUAL_LEARNING_TRIAL_DURATION_MINUTES` (or legacy `CONTINUOUS_LEARNING_TRIAL_DURATION_MINUTES`)

## Output format

The memory updater writes only:

- `## Learned User Preferences`
- `## Learned Workspace Facts`

Each item is a plain bullet point.

## Migration from marketplace

Older versions stored cadence/index at
`.cursor/hooks/state/continual-learning.json` and
`continual-learning-index.json`. On first run this fork copies them into the
user-scoped state dir. Tracked originals are left in place; untracked
originals are removed so they stop showing up in `git status`.

## License

MIT

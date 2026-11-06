# Continual Learning

Automatically and incrementally keeps a **user-scoped** memory file up to date
from transcript changes. Safe to enable in repositories that already track a
team-owned `AGENTS.md`.

Default write target:

```text
~/.cursor/projects/<slug>/AGENTS.local.md
```

`<slug>` is the absolute workspace path with the leading `/` stripped and `/`
replaced by `-` (same layout as `agent-transcripts/`). Cursor stacks this file
with the repo `AGENTS.md`.

The plugin combines:

- A `stop` hook that decides when to trigger learning and embeds absolute
  memory/index paths in the followup.
- A `continual-learning` skill that orchestrates the learning flow.
- An `agents-memory-updater` subagent that mines new or changed transcripts
  and updates `AGENTS.local.md`.
- A `preToolUse` hook that denies Write/StrReplace of `## Learned *` sections
  into a repo-tracked `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`, unless that path
  is an explicit shared workspace file that is allowed.

It is designed to avoid noisy rewrites by:

- Reading the existing memory file first and updating matching bullets in place.
- Processing only new or changed transcript files.
- Writing plain bullet points only (no evidence/confidence metadata).

## Installation

```bash
/add-plugin continual-learning
```

## Safe defaults for team repos

Learned bullets no longer go into the workspace `AGENTS.md` by default. That
file is often owned by the whole team; writing personal preferences there
creates dirty trees and accidental commits.

Cadence and the incremental transcript index also default to:

```text
~/.cursor/projects/<slug>/continual-learning/
```

instead of `.cursor/hooks/state/` inside the repo.

Section titles stay:

- `## Learned User Preferences`
- `## Learned Workspace Facts`

Existing `AGENTS.local.md` files keep working; headings are not renamed.

## How it works

On eligible `stop` events, the hook may emit a `followup_message` that asks the
agent to run the `continual-learning` skill.

The skill is marked `disable-model-invocation: true`, so it will not be
auto-selected during normal model invocation. When it does run, it delegates
the full memory update flow to `agents-memory-updater`.

The hook keeps local runtime state in:

- `~/.cursor/projects/<slug>/continual-learning/cadence.json`

The updater uses an incremental transcript index at:

- `~/.cursor/projects/<slug>/continual-learning/index.json`

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
- `CONTINUAL_LEARNING_ALLOW_SHARED` — bypass the git-leak check for the
  configured workspace file (also allows the `preToolUse` deny hook to let
  that write through).

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

## Migration

Older versions stored cadence/index at
`.cursor/hooks/state/continual-learning.json` and
`continual-learning-index.json`. On first run the plugin copies them into the
user-scoped state dir. Tracked originals are left in place; untracked
originals are removed so they stop showing up in `git status`.

To restore the old shared-file behavior, set
`CONTINUAL_LEARNING_WORKSPACE_FILE` to the repo `AGENTS.md` and
`CONTINUAL_LEARNING_ALLOW_SHARED=1`.

## License

MIT

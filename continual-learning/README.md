# Continual Learning

Automatically and incrementally keeps a memory file up to date from transcript
changes.

The plugin combines:

- A `stop` hook that decides when to trigger learning.
- A `continual-learning` skill that orchestrates the learning flow.
- An `agents-memory-updater` subagent that mines new or changed transcripts
  and updates the memory file(s).

It is designed to avoid noisy rewrites by:

- Reading the existing memory file first and updating matching bullets in place.
- Processing only new or changed transcript files.
- Writing plain bullet points only (no evidence/confidence metadata).

## Installation

```bash
/add-plugin continual-learning
```

## Safe defaults for team repos

This plugin defaults to writing to a **user-scoped** memory file outside the
repository, so it is safe to enable inside repos shared with other people. By
default it writes to:

- Memory file: `~/.cursor/projects/<workspace-slug>/AGENTS.local.md`
- State directory: `~/.cursor/projects/<workspace-slug>/continual-learning/`
  - `cadence.json` — hook cadence state
  - `index.json` — incremental transcript index

`<workspace-slug>` mirrors Cursor's existing layout under
`~/.cursor/projects/<slug>/agent-transcripts/`. Nothing is written inside the
repository unless you opt in.

The repository's `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` is **never** touched
by default. If you want team-shareable workspace facts written somewhere
inside the repo, set `CONTINUAL_LEARNING_WORKSPACE_FILE` to a path that is
gitignored (or set `CONTINUAL_LEARNING_ALLOW_SHARED=1` to bypass the
git-leak check at your own risk).

## How it works

On eligible `stop` events, the hook may emit a `followup_message` that asks
the agent to run the `continual-learning` skill. The followup message contains
the already-resolved absolute paths for that run, so the subagent does not
need to recompute them.

The skill is marked `disable-model-invocation: true`, so it will not be
auto-selected during normal model invocation. When it does run, it delegates
the full memory update flow to `agents-memory-updater`.

## Trigger cadence

Default cadence:

- minimum 10 completed turns
- minimum 120 minutes since the last run
- transcript mtime must advance since the previous run

Trial mode defaults (enabled in this plugin hook config):

- minimum 3 completed turns
- minimum 15 minutes
- automatically expires after 24 hours, then falls back to default cadence

## Configuration (all env vars are optional)

**Memory targets**

- `CONTINUAL_LEARNING_USER_FILE` — absolute path to the user-scoped memory
  file. Default: `~/.cursor/projects/<slug>/AGENTS.local.md`. Personal,
  never shared.
- `CONTINUAL_LEARNING_WORKSPACE_FILE` — absolute path to an optional
  workspace-scoped memory file that may be shared with the team. Unset by
  default. The plugin refuses to write to this file if it is inside a git
  repo and not gitignored, unless `CONTINUAL_LEARNING_ALLOW_SHARED=1`.
- `CONTINUAL_LEARNING_STATE_DIR` — directory for `cadence.json` and
  `index.json`. Default: `~/.cursor/projects/<slug>/continual-learning/`.
- `CONTINUAL_LEARNING_ALLOW_SHARED` — set to `1` to bypass the git-leak
  check for `CONTINUAL_LEARNING_WORKSPACE_FILE`. Use with care.

**Cadence (unchanged)**

- `CONTINUAL_LEARNING_MIN_TURNS` (or legacy `CONTINUOUS_LEARNING_MIN_TURNS`)
- `CONTINUAL_LEARNING_MIN_MINUTES` (or legacy `CONTINUOUS_LEARNING_MIN_MINUTES`)
- `CONTINUAL_LEARNING_TRIAL_MODE` (or legacy `CONTINUOUS_LEARNING_TRIAL_MODE`)
- `CONTINUAL_LEARNING_TRIAL_MIN_TURNS` (or legacy `CONTINUOUS_LEARNING_TRIAL_MIN_TURNS`)
- `CONTINUAL_LEARNING_TRIAL_MIN_MINUTES` (or legacy `CONTINUOUS_LEARNING_TRIAL_MIN_MINUTES`)
- `CONTINUAL_LEARNING_TRIAL_DURATION_MINUTES` (or legacy `CONTINUOUS_LEARNING_TRIAL_DURATION_MINUTES`)

## Output format

Section routing:

- `## Learned User Preferences` → user memory file only.
- `## Learned Workspace Facts` → workspace memory file when configured and
  not blocked.
- `## Learned Workspace Facts (local)` → user memory file when no workspace
  file is configured or the workspace file is blocked.

Each item is a plain bullet point.

## Migration from older versions

Older versions wrote state into the repository at
`.cursor/hooks/state/continual-learning.json` and
`.cursor/hooks/state/continual-learning-index.json`. On first run the hook
copies any pre-existing legacy state into the new user-scoped location,
leaves a `.legacy` copy next to each original (for recovery), and removes
the originals so they stop appearing in `git status`.

## License

MIT

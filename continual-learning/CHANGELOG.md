# Changelog

All notable changes to this plugin will be documented here.

## Unreleased

- Default memory file moved to a user-scoped path
  (`~/.cursor/projects/<workspace-slug>/AGENTS.local.md`) so the plugin is safe
  to enable inside team repositories. The repository's `AGENTS.md` /
  `CLAUDE.md` / `GEMINI.md` is no longer written by default.
- Cadence and incremental-index state moved out of `.cursor/hooks/state/`
  into `~/.cursor/projects/<workspace-slug>/continual-learning/`. Legacy
  state files are migrated to the new location and removed from the
  repository on first run (a backup copy is kept under the user-scoped state
  directory).
- New opt-in `CONTINUAL_LEARNING_WORKSPACE_FILE` env var lets users point
  the plugin at a workspace-scoped memory file when they explicitly want
  team-shareable workspace facts written somewhere inside the repo.
- The hook now runs `git check-ignore` against any configured workspace
  memory file and refuses to write to it when the file is inside a git repo
  and not gitignored, unless `CONTINUAL_LEARNING_ALLOW_SHARED=1`.
- Added `CONTINUAL_LEARNING_USER_FILE`, `CONTINUAL_LEARNING_STATE_DIR`, and
  `CONTINUAL_LEARNING_ALLOW_SHARED` env vars. All existing cadence env vars
  are unchanged.
- The hook now embeds the already-resolved target paths and any safety-check
  block reason directly into the `followup_message`, so the
  `agents-memory-updater` subagent does not need to recompute them.
- Section routing made explicit: `## Learned User Preferences` always lives
  in the user file; `## Learned Workspace Facts` lives in the workspace file
  when configured and not blocked; a `## Learned Workspace Facts (local)`
  fallback heading is used in the user file otherwise.

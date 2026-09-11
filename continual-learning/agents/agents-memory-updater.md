---
name: agents-memory-updater
description: Mine high-signal transcript deltas, update the user-scoped memory file (and optionally a workspace memory file), and keep the incremental transcript index in sync.
model: inherit
---

# Memory updater

Own the full memory update flow for continual learning.

## Trigger

Use from `continual-learning` when transcript deltas may produce durable memory
updates.

## Target files

The plugin separates personal learnings from team-shareable ones at the file
level so it is safe to run inside team repositories.

**User memory file** (always written, personal, never committed):

- Path: `$CONTINUAL_LEARNING_USER_FILE` if set; otherwise
  `~/.cursor/projects/<workspace-slug>/AGENTS.local.md`.
  `<workspace-slug>` is the absolute workspace path with the leading `/`
  stripped and remaining `/` replaced by `-` (e.g. `/Users/yury/Dev/qvac/wb`
  → `Users-yury-Dev-qvac-wb`). This matches Cursor's existing
  `~/.cursor/projects/<slug>/agent-transcripts/` convention.
- Owns `## Learned User Preferences`.
- Owns `## Learned Workspace Facts (local)` whenever no safe workspace file is
  available.

**Workspace memory file** (opt-in, may be committed and read by the whole team):

- Path: `$CONTINUAL_LEARNING_WORKSPACE_FILE`. Unset by default — skip workspace
  writes entirely when unset.
- Owns `## Learned Workspace Facts` only.
- Safety check: from the workspace root, run
  `git check-ignore -q -- <workspace file>`. Exit `1` means the file is inside
  a git repo and NOT gitignored, so writing to it would leak into the team's
  commits — refuse the write unless `CONTINUAL_LEARNING_ALLOW_SHARED=1`. When
  blocked, route those facts into the user file under
  `## Learned Workspace Facts (local)` instead.

**Incremental index and cadence**:

- `$CONTINUAL_LEARNING_STATE_DIR` if set; otherwise
  `~/.cursor/projects/<workspace-slug>/continual-learning/`.
- Index: `<state-dir>/index.json`.
- Cadence (owned by the stop hook): `<state-dir>/cadence.json`.

When invoked from the stop hook, the followup message contains the already-
resolved absolute paths for this run. Use those verbatim and skip the env-var
resolution above.

## Workflow

1. Resolve the target paths (use the ones embedded in the followup message
   when present; otherwise apply the rules above). Verify the workspace file
   safety check before treating it as writable.
2. For each target memory file you may write to:
   - Read the existing file if it exists.
   - Otherwise prepare a new file containing only the section headings that
     file owns (see "Target files").
3. Load the incremental index from the resolved index path.
4. Inspect only transcript files under
   `~/.cursor/projects/<workspace-slug>/agent-transcripts/` that are new or
   have newer mtimes than the index.
5. Extract only durable, reusable items:
   - recurring user preferences or corrections → user memory file
   - stable workspace facts → workspace memory file when available and not
     blocked; otherwise user memory file under
     `## Learned Workspace Facts (local)`.
6. Update each target file carefully:
   - update matching bullets in place
   - add only net-new bullets
   - deduplicate semantically similar bullets
   - keep each section to at most 12 bullets
7. Refresh the index for processed transcripts and remove entries for files
   that no longer exist.
8. If the merge produces no file changes, leave the memory files unchanged
   but still refresh the index.
9. If no meaningful updates exist, respond exactly:
   `No high-signal memory updates.`
10. If the workspace file was blocked by the git-leak check, say so plainly in
    the summary, e.g. *"Workspace file blocked: not gitignored. Wrote workspace
    facts to the user file under `## Learned Workspace Facts (local)`."*

## Guardrails

- Use plain bullet points only.
- Section headings allowed:
  - `## Learned User Preferences` (user file)
  - `## Learned Workspace Facts` (workspace file only)
  - `## Learned Workspace Facts (local)` (user file fallback when no workspace
    file is configured or it is blocked)
- Never write evidence/confidence tags, process instructions, rationale, or
  metadata blocks.
- Never write to the workspace memory file when the git-leak check fails
  unless `CONTINUAL_LEARNING_ALLOW_SHARED=1`.
- Never write directly to a repo-level `AGENTS.md` / `CLAUDE.md` /
  `GEMINI.md` unless the user explicitly pointed
  `CONTINUAL_LEARNING_WORKSPACE_FILE` at one AND set
  `CONTINUAL_LEARNING_ALLOW_SHARED=1`.
- Exclude secrets, private data, one-off instructions, and transient details.

## Output

- Updated memory file(s) and the index when needed.
- A short summary that lists which paths were written (or why a write was
  skipped).
- Otherwise exactly `No high-signal memory updates.`

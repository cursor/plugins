---
name: agents-memory-updater
description: Mine high-signal transcript deltas, update the user-scoped AGENTS.local.md memory file, and keep the incremental transcript index in sync.
model: inherit
---

# Memory updater

Own the full memory update flow for continual learning.

## Trigger

Use from `continual-learning` when transcript deltas may produce durable memory updates.

## Target files

**User memory file** (always written, personal, never committed):

- Path from the followup message when present; otherwise
  `$CONTINUAL_LEARNING_USER_FILE` or
  `~/.cursor/projects/<slug>/AGENTS.local.md`.
- `<slug>` is the absolute workspace path with the leading `/` stripped and
  remaining `/` replaced by `-`.
- Owns `## Learned User Preferences` and `## Learned Workspace Facts`.
- Do **not** rename the workspace-facts heading to `(local)`.

**Workspace memory file** (opt-in only):

- `$CONTINUAL_LEARNING_WORKSPACE_FILE`. Unset by default — skip it.
- Refuse the write when `git check-ignore -q` exits `1` unless
  `CONTINUAL_LEARNING_ALLOW_SHARED=1`.

**Never** write `## Learned User Preferences` or `## Learned Workspace Facts`
into a repo-tracked `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`.

**Index**: `$CONTINUAL_LEARNING_STATE_DIR/index.json` if set; otherwise
`~/.cursor/projects/<slug>/continual-learning/index.json`. Prefer the absolute
index path embedded in the followup message.

## Workflow

1. Resolve target paths from the followup message when present.
2. Read the existing user memory file. If it does not exist, create it with only:
   - `## Learned User Preferences`
   - `## Learned Workspace Facts`
3. Load the incremental index.
4. Inspect only transcript files under
   `~/.cursor/projects/<workspace-slug>/agent-transcripts/` that are new or
   have newer mtimes than the index.
5. Extract only durable, reusable items.
6. Update the user memory file:
   - update matching bullets in place
   - add only net-new bullets
   - deduplicate semantically similar bullets
   - keep each section to at most 12 bullets
7. Refresh the index for processed transcripts and remove entries for files
   that no longer exist.
8. If the merge produces no file changes, leave the memory file unchanged
   but still refresh the index.
9. If no meaningful updates exist, respond exactly:
   `No high-signal memory updates.`

## Guardrails

- Use plain bullet points only.
- Keep only these sections:
  - `## Learned User Preferences`
  - `## Learned Workspace Facts`
- Do not write evidence/confidence tags, process instructions, rationale, or metadata.
- Exclude secrets, private data, one-off instructions, and transient details.

## Output

- Updated the user memory file and the index when needed.
- Otherwise exactly `No high-signal memory updates.`

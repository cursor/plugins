---
name: agents-memory-updater
description: Mine high-signal transcript deltas, update `AGENTS.md`, and keep the incremental transcript index in sync.
model: inherit
---

# AGENTS.md memory updater

Own the full memory update flow for continual learning.

## Trigger

Use from `continual-learning` when transcript deltas may produce durable memory updates.

## Workflow

Before reading transcripts or writing any files, run the absolute workspace-exclusion
helper path supplied by `continual-learning` with `bun run`, quoting the path and
using the supplied workspace directory as the working directory. Do not rely on
`CURSOR_PLUGIN_ROOT` being available in the shell. Continue only if the command
succeeds and returns `{"excluded":false}`. If it reports an exclusion, fails, or
returns an unexpected result, stop without updating memory or the incremental index.

If the helper path or workspace directory is missing, stop and ask the caller to
invoke the `continual-learning` skill, which resolves the installed helper path.
Use that skill for manually requested updates too.

1. Read existing `AGENTS.md` first. If it does not exist, create it with only:
   - `## Learned User Preferences`
   - `## Learned Workspace Facts`
2. Load the incremental index if present.
3. Inspect only transcript files under `~/.cursor/projects/<workspace-slug>/agent-transcripts/` that are new or have newer mtimes than the index.
4. Pull out only durable, reusable items:
   - recurring user preferences or corrections
   - stable workspace facts
5. Update `AGENTS.md` carefully:
   - update matching bullets in place
   - add only net-new bullets
   - deduplicate semantically similar bullets
   - keep each learned section to at most 12 bullets
6. Refresh the incremental index for processed transcripts and remove entries for files that no longer exist.
7. If the merge produces no `AGENTS.md` changes, leave `AGENTS.md` unchanged but still refresh the index.
8. If no meaningful updates exist, respond exactly: `No high-signal memory updates.`

## Guardrails

- Use plain bullet points only.
- Keep only these sections:
  - `## Learned User Preferences`
  - `## Learned Workspace Facts`
- Do not write evidence/confidence tags.
- Do not write process instructions, rationale, or metadata blocks.
- Exclude secrets, private data, one-off instructions, and transient details.

## Output

- Updated `AGENTS.md` and `.cursor/hooks/state/continual-learning-index.json` when needed
- Otherwise exactly `No high-signal memory updates.`

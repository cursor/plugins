---
name: agents-memory-updater
description: Merge high-signal continual-learning updates into `AGENTS.md` and keep the incremental transcript index in sync. Use from the `continual-learning` skill when transcript deltas may change durable memory.
model: inherit
---

# AGENTS.md memory updater

Own the actual `AGENTS.md` write for continual learning.

## Inputs

- Existing memory file: `AGENTS.md`
- Incremental index: `.cursor/hooks/state/continual-learning-index.json`
- Transcript root: `~/.cursor/projects/<workspace-slug>/agent-transcripts/`
- Any narrowed list of changed transcripts from the caller
- Any extracted candidate bullets from the caller

## Workflow

1. Read existing `AGENTS.md` first. If it does not exist, create it with only:
   - `## Learned User Preferences`
   - `## Learned Workspace Facts`
2. Load the incremental index if present.
3. Use the caller's narrowed transcript set or extracted bullets when provided. Otherwise, inspect only transcript files that are new or whose mtimes are newer than the index.
4. Keep only high-signal reusable information:
   - recurring user corrections/preferences
   - durable workspace facts
5. Update `AGENTS.md` carefully:
   - update matching bullets in place
   - add only net-new bullets
   - deduplicate semantically similar bullets
   - keep each learned section to at most 12 bullets
6. Write back the incremental index:
   - store latest mtimes for processed files
   - remove entries for files that no longer exist
7. If no meaningful updates exist, leave `AGENTS.md` unchanged and respond exactly: `No high-signal memory updates.`

## Guardrails

- Use plain bullet points only.
- Keep only these sections:
  - `## Learned User Preferences`
  - `## Learned Workspace Facts`
- Do not write evidence/confidence tags.
- Do not write process instructions, rationale, or metadata blocks.
- Never store secrets, credentials, private personal data, or one-off instructions.
- Exclude transient details like branch names, commit hashes, or temporary errors.

## Output

- Updated `AGENTS.md` and `.cursor/hooks/state/continual-learning-index.json` when needed
- Otherwise exactly `No high-signal memory updates.`

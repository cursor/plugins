---
name: continual-learning
description: Incrementally extract recurring user corrections and durable workspace facts from transcript changes, then delegate the AGENTS.md merge/update to a dedicated subagent. Use when the user asks to mine previous chats, maintain AGENTS.md memory, or build a self-learning preference loop.
disable-model-invocation: true
---

# Continual Learning

Keep `AGENTS.md` current using transcript deltas instead of full rescans.

## Inputs

- Transcript root: `~/.cursor/projects/<workspace-slug>/agent-transcripts/`
- Existing memory file: `AGENTS.md`
- Incremental index: `.cursor/hooks/state/continual-learning-index.json`
- AGENTS updater subagent: `agents-memory-updater`

## Workflow

1. Read existing `AGENTS.md` first.
2. Load incremental index if present.
3. Discover transcript files and identify only:
   - new files not in index, or
   - files whose mtime is newer than indexed mtime.
4. Extract only high-signal, reusable information:
   - recurring user corrections/preferences
   - durable workspace facts
5. Invoke the `agents-memory-updater` subagent to do the actual `AGENTS.md` merge/write:
   - pass the transcript root, incremental index path, and any narrowed set of changed transcripts
   - pass the extracted candidate bullets grouped into user preferences vs workspace facts
   - tell it to update matching bullets in place, add only net-new bullets, and deduplicate semantic duplicates
   - do not edit `AGENTS.md` directly in the parent flow; the subagent owns that step
6. Let the subagent write back the incremental index:
   - store latest mtimes for processed files
   - remove entries for files that no longer exist
7. If no meaningful updates exist, respond exactly: `No high-signal memory updates.`

## AGENTS.md Output Contract

- Keep only these sections:
  - `## Learned User Preferences`
  - `## Learned Workspace Facts`
- Use plain bullet points only.
- Do not write evidence/confidence tags.
- Do not write process instructions, rationale, or metadata blocks.
- Keep each learned section to at most 12 bullets.

## Inclusion Bar

Keep an item only if all are true:

- actionable in future sessions
- stable across sessions
- repeated in multiple transcripts, or explicitly stated as a broad rule
- non-sensitive

## Exclusions

Never store:

- secrets, tokens, credentials, private personal data
- one-off task instructions
- transient details (branch names, commit hashes, temporary errors)

## Incremental Index Format

```json
{
  "version": 1,
  "transcripts": {
    "/abs/path/to/file.jsonl": {
      "mtimeMs": 1730000000000,
      "lastProcessedAt": "2026-02-18T12:00:00.000Z"
    }
  }
}
```

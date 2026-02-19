---
name: continuous-learning
description: Incrementally extract recurring user corrections and durable workspace facts from transcript changes, then update AGENTS.md with plain bullet points only. Use when the user asks to mine previous chats, maintain AGENTS.md memory, or build a self-learning preference loop.
---

# Continuous Learning

Keep `AGENTS.md` current using transcript deltas instead of full rescans.

## Inputs

- Transcript root: `~/.cursor/projects/<workspace-slug>/agent-transcripts/`
- Existing memory file: `AGENTS.md`
- Incremental index: `.cursor/hooks/state/continuous-learning-index.json`

## Workflow

1. Read existing `AGENTS.md` first.
2. Load incremental index if present.
3. Discover transcript files and process only:
   - new files not in index, or
   - files whose mtime is newer than indexed mtime.
4. Extract only high-signal, reusable information:
   - recurring user corrections/preferences
   - durable workspace facts
5. Merge with existing bullets in `AGENTS.md`:
   - update matching bullets in place
   - add only net-new bullets
   - deduplicate semantically similar bullets
6. Write back the incremental index:
   - store latest mtimes for processed files
   - remove entries for files that no longer exist

## AGENTS.md Output Contract

- Keep only these sections:
  - `## Learned User Preferences`
  - `## Learned Workspace Facts`
- Use plain bullet points only.
- Do not write evidence/confidence tags.
- Do not write process instructions, rationale, or metadata blocks.

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

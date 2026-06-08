---
name: falconer-knowledge
description: "Use when working with Falconer documents through MCP: reading, searching, drafting, editing, preserving Falconer Markdown syntax, using rich document blocks, uploading media, or changing document navigation, comments, permissions, or revisions."
---

# Falconer Knowledge

Use Falconer MCP tools to read, search, create, and update Falconer documents. Falconer document content is Markdown with Falconer-specific extensions. Preserve existing syntax exactly unless the user explicitly asks to change it.

## Core rules

- Preserve inline references exactly: `![f>][reference-id]`.
- Preserve legacy inline references exactly: `![f>][display text][reference-id]`.
- Do not invent Falconer reference IDs.
- Prefer targeted content tools over whole-document overwrite.
- Use `upload_media` before inserting local image or video content.
- Ask for explicit user intent before delete, publish, permission changes, folder reorders, revision restore/delete, or overwrite.
- Inspect navigation placement before moving documents or folders.

## Formatting

For Falconer-specific Markdown and rich components, read `references/falconer-formatting.md` when drafting or editing document content.

## Editing workflow

1. Read the relevant document before editing.
2. Preserve references, math, tables, task lists, diagrams, callouts, and rich blocks unless the requested change requires modifying them.
3. Use targeted replace, insert, or delete tools when possible.
4. Use overwrite only when the user clearly asks for a full rewrite or replacement.
5. After editing, summarize the material change and call out any risky operation performed.

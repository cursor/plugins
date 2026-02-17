---
name: deslop
description: Remove AI-generated code slop, unnecessary comments, and clean up code style against the diff from main.
---

# Remove AI Code Slop

Check the diff against main and remove AI-generated slop introduced in the branch.

## Focus Areas

- Unnecessary comments that state the obvious
- Defensive try/catch blocks that are abnormal for trusted code paths
- Over-engineered abstractions for one-time operations
- Deeply nested code that should be simplified with early returns
- Backwards-compatibility hacks (renamed _vars, re-exports, // removed comments)
- Features or refactoring beyond what was requested

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1-3 sentences).

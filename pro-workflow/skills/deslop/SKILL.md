---
name: deslop
description: Remove AI-generated code slop, unnecessary comments, and over-engineering from the current branch diff. Use after completing changes and before committing.
---

# Remove AI Code Slop

Check the diff against main and remove AI-generated slop introduced in the branch.

## Trigger

Use after completing changes, before committing, or when code feels over-engineered.

## Commands

```bash
git fetch origin main
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

## Focus Areas

- Extra comments that state the obvious or are inconsistent with local style
- Defensive try/catch blocks that are abnormal for trusted internal code paths
- Casts to `any` used only to bypass type issues
- Over-engineered abstractions for one-time operations (premature helpers, factories)
- Deeply nested code that should be simplified with early returns
- Backwards-compatibility hacks (renamed `_vars`, re-exports, `// removed` comments)
- Features, refactoring, or "improvements" beyond what was requested
- Added docstrings, type annotations, or comments on code that wasn't changed
- Error handling for scenarios that can't happen in trusted internal paths

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Three similar lines of code is better than a premature abstraction.
- If you remove something, verify it's truly unused first.
- Keep the final summary concise (1-3 sentences).

## Output

- List of slop patterns found with file locations
- Edits applied
- One-line summary of what was cleaned

---
name: deslop
description: "Remove AI-generated code slop and clean up code style. Before commit, align the pull request title and scope with the falsifiable done predicate, so a harness-only change is not described as the finished migration."
---

# Remove AI code slop

Check the diff against main and remove AI-generated slop introduced in the branch.

## Focus Areas

- Extra comments that are unnecessary or inconsistent with local style
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Other patterns inconsistent with the file and surrounding codebase
- A pull request title or scope that claims the finished migration while the falsifiable predicate is still a harness, an allowlist, or an unwired library

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1-3 sentences).

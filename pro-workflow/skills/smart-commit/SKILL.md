---
name: smart-commit
description: Run quality gates, review staged changes, and create a well-crafted commit. Use when ready to commit after making changes.
---

# Smart Commit

Create a well-crafted commit after running quality checks.

## Trigger

Use when the user says "commit", "save changes", or is ready to commit.

## Workflow

1. Run `git status` and `git diff --stat` to see what changed.
2. Run quality gates: lint, typecheck, test affected code.
3. Scan staged changes for console.log, TODOs, hardcoded secrets, leftover test code.
4. Draft commit message in conventional format: `<type>(<scope>): <summary>`.
5. Stage specific files (not `git add -A`), create the commit.
6. Ask if any learnings to capture from this change.

## Guardrails

- Never skip quality gates unless user explicitly asks.
- Stage specific files by name, not `git add -A`.
- Summary under 72 characters. Body explains why, not what.
- Flag any issues before proceeding.

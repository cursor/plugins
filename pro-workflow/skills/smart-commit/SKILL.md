---
name: smart-commit
description: Run quality gates, review staged changes for issues, and create a well-crafted conventional commit. Use when ready to commit after making changes.
---

# Smart Commit

## Trigger

Use when saying "commit", "save changes", or ready to commit after making changes.

## Workflow

1. Check current state and identify what to commit.
2. Run quality gates (lint, typecheck, tests on affected files).
3. Scan staged changes for issues.
4. Draft a conventional commit message from the diff.
5. Stage specific files, create the commit.
6. Prompt for learnings from this change.

## Commands

```bash
git status
git diff --stat

npm run lint 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
npm test -- --changed --passWithNoTests 2>&1 | tail -10

git add <specific files>
git commit -m "<type>(<scope>): <summary>"
```

## Code Review Scan

Before committing, check staged changes for:
- `console.log` / `debugger` statements
- TODO/FIXME/HACK comments without ticket references
- Hardcoded secrets or API keys
- Leftover test-only code

Flag any issues before proceeding.

## Commit Message Format

```
<type>(<scope>): <short summary>

<body - what changed and why>
```

**Types:** feat, fix, refactor, test, docs, chore, perf, ci, style

## Guardrails

- Never skip quality gates unless user explicitly says to.
- Stage specific files by name. Never `git add -A` or `git add .`.
- Summary under 72 characters. Body explains *why*, not *what*.
- No generic messages ("fix bug", "update code").
- Reference issue numbers when applicable.

## Output

- Quality gate results (pass/fail)
- Issues found in staged changes
- Suggested commit message
- Commit hash after committing
- Prompt: any learnings to capture?

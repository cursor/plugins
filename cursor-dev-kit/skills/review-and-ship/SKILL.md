---
name: review-and-ship
description: Run a structured review, close key issues, and ship changes via PR
---

# Skill: Review and Ship

Use this workflow to review changes thoroughly and ship confidently.

## Workflow

1. Review diff against base branch and identify behavior-impacting risks.
2. Run or update tests for changed behavior.
3. Fix critical issues before finalizing.
4. Commit selective files with a concise message.
5. Push branch and open or update a PR.

## Suggested Checks

```bash
git fetch origin main
git diff origin/main...HEAD
git status
```

## Guardrails

- Prioritize correctness, security, and regressions over style-only comments.
- Keep commits focused and avoid unrelated file changes.
- If pre-commit checks fail, fix the issues rather than bypassing hooks.

## Output

- Findings summary (critical, warning, note)
- Tests run and outcomes
- PR URL

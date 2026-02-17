---
name: wrap-up
description: End-of-session ritual that audits changes, runs quality checks, captures learnings, and produces a session summary. Use when ending a coding session.
---

# Wrap-Up Ritual

End your coding session with intention.

## Trigger

Use when ending a session, saying "wrap up", "done for now", or before closing the editor.

## Workflow

1. **Changes Audit** — What files were modified? Anything uncommitted? TODOs left in code?
2. **Quality Check** — Run lint, typecheck, and tests. All passing? Any warnings?
3. **Learning Capture** — What mistakes were made? What patterns worked well? Format as `[LEARN] Category: Rule`
4. **Next Session Context** — What's the next logical task? Any blockers? Context to preserve?
5. **Summary** — One paragraph: what was accomplished, current state, what's next.

## Commands

```bash
git status
git diff --stat

npm run lint 2>&1 | head -20
npm run typecheck 2>&1 | head -20
npm test -- --changed --passWithNoTests
```

## Learning Categories

Navigation, Editing, Testing, Git, Quality, Context, Architecture, Performance

## Guardrails

- Do not skip any checklist step.
- If tests are failing, flag before ending session.
- If uncommitted changes exist, ask whether to commit or stash.

## Output

- Modified file list with uncommitted changes highlighted
- Quality gate results
- Captured learnings (if any)
- One-paragraph session summary
- Next session resume context

After completing checklist, ask: "Ready to end session?"

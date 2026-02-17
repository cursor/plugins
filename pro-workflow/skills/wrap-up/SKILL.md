---
name: wrap-up
description: End-of-session ritual that audits changes, runs quality checks, captures learnings, and summarizes what was accomplished. Use when ending a coding session.
---

# Wrap-Up Ritual

End your coding session with intention.

## Trigger

Use when ending a session, saying "wrap up", or before closing the editor.

## Workflow

1. **Changes Audit** - Run `git status` and `git diff --stat`. Any uncommitted changes? TODOs left in code?
2. **Quality Check** - Run lint, typecheck, and tests. All passing?
3. **Learning Capture** - What mistakes were made? What patterns worked? Format: `[LEARN] Category: Rule`
4. **Next Session** - What's the next task? Any blockers? Context to preserve?
5. **Summary** - Write one paragraph: what was accomplished, current state, what's next.

## Output

- Changes audit with uncommitted file list
- Quality gate results
- Captured learnings (if any)
- One-paragraph session summary

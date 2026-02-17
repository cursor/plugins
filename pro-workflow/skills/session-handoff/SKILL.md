---
name: session-handoff
description: Generate a structured handoff document for the next session to continue where you left off. Use when ending a session and wanting to resume later.
---

# Session Handoff

Generate a handoff document designed for the next session to consume immediately.

## Trigger

Use when saying "handoff", "continue later", or "pass to next session".

## Workflow

1. Gather current state: `git status`, `git diff --stat`, `git log --oneline -5`
2. List completed, in-progress, and pending work.
3. Note key decisions made and their reasoning.
4. Generate structured handoff with resume command.

## Output

```markdown
# Session Handoff

## Status
- Branch, commits, uncommitted changes, test status

## What's Done / In Progress / Pending

## Key Decisions Made

## Gotchas for Next Session

## Resume Command
> Continue working on [branch]. [context]. Next step: [action].
```

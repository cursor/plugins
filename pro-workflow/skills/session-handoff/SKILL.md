---
name: session-handoff
description: Generate a structured handoff document designed for the next session to consume immediately and continue where you left off. Use when ending a session.
---

# Session Handoff

Different from wrap-up. Wrap-up is a checklist for *you*. Handoff is a document written for the *next session*.

## Trigger

Use when saying "handoff", "continue later", "pass to next session", "session transfer", or ending a session and wanting to resume smoothly.

## Workflow

1. Gather current state from git.
2. List completed, in-progress, and pending work.
3. Note key decisions made and their reasoning.
4. Capture any learnings from this session.
5. Generate a resume command for the next session.

## Commands

```bash
git status
git diff --stat
git log --oneline -5
git branch --show-current
```

## Output

```markdown
# Session Handoff — [date] [time]

## Status
- **Branch**: feature/xyz
- **Commits this session**: 3
- **Uncommitted changes**: 2 files modified
- **Tests**: passing / failing / not run

## What's Done
- [completed task 1]
- [completed task 2]

## What's In Progress
- [current task with context on where you stopped]
- [file:line that needs attention next]

## What's Pending
- [next task that hasn't been started]
- [blocked items with reason]

## Key Decisions Made
- [decision 1 and why]
- [decision 2 and why]

## Learnings Captured
- [Category] Rule (from this session)

## Files Touched
- `path/to/file1.ts` — [what changed]
- `path/to/file2.ts` — [what changed]

## Gotchas for Next Session
- [thing that tripped you up]
- [non-obvious behavior discovered]

## Resume Command
> Continue working on [branch]. [1-2 sentence context]. Next step: [specific action].
```

## Guardrails

- Write for the reader (next session), not the writer.
- Include specific file paths and line numbers where relevant.
- The resume command should be copy-pasteable into the next session.
- Keep it factual — describe changes functionally, don't infer motivation.

---
name: replay-learnings
description: Surface past learnings relevant to the current task before starting work. Searches correction history and patterns. Use when starting a task or saying "what do I know about".
---

# Replay Learnings

Like muscle memory for your coding sessions. Find and surface relevant learnings before you start working.

## Trigger

Use when starting a new task, saying "what do I know about", "before I start", "replay", or "remind me about".

## Workflow

1. Extract keywords from the task description.
2. Search learnings/memory for matching patterns (corrections, rules, past mistakes).
3. Check session history for similar work — what was the correction rate?
4. Surface the top learnings ranked by relevance.
5. If no learnings found, suggest starting with the scout agent to explore first.

## Output

```
REPLAY BRIEFING: <task>
=======================

Past learnings (ranked by relevance):
  1. [Testing] Always mock external APIs in auth tests (applied 8x)
     Mistake: Called live API in tests, caused flaky failures
  2. [Navigation] Auth middleware is in src/middleware/ not src/auth/ (applied 5x)
  3. [Quality] Add error boundary around auth state changes (applied 3x)

Session history for similar work:
  - 2026-02-01: auth refactor — 23 edits, 2 corrections (8.7% rate)
  - 2026-01-28: auth middleware — 15 edits, 4 corrections (26.7% rate)
    ^ Higher correction rate — review patterns before starting

Suggested approach:
  - Mock external APIs (learning #1)
  - Check src/middleware/ first for auth code (learning #2)
```

## Guardrails

- Rank by relevance, not recency.
- Include the original mistake context so the learning is actionable.
- Flag high correction-rate sessions as areas requiring extra care.
- If no learnings match, say so explicitly rather than forcing irrelevant results.

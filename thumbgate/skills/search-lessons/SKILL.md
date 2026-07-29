---
name: search-lessons
description: Search promoted lessons for corrective actions, lifecycle state, linked rules, and linked gates.
---

# Search Lessons

Search the promoted lessons database for corrective actions and guidance.

## When to use

- Looking for corrective actions for a specific failure pattern
- Checking if a known lesson applies to the current task
- Reviewing lifecycle state of lessons (active, archived, superseded)
- Finding linked prevention rules and gates for a topic

## How it works

Use the `search_lessons` MCP tool with a query string. The tool searches across:

1. **Lesson descriptions** — What happened and why
2. **Corrective actions** — Specific steps to prevent recurrence
3. **Linked rules** — Prevention rules generated from the lesson
4. **Linked gates** — Pre-action gates that enforce the lesson
5. **Lifecycle state** — Whether the lesson is active, archived, or superseded

## Example

```
Search lessons for "force push" to find corrective actions and prevention rules related to force pushing.
```

Results include the full lesson context, any linked enforcement rules, and the current lifecycle state.

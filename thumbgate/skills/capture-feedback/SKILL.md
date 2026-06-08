---
name: capture-feedback
description: Capture structured thumbs up/down feedback with context, history-aware lesson distillation, tags, and optional rubric scores after completing a task.
---

# Capture Feedback

Record structured feedback after completing a task or encountering an issue.

## When to use

- After completing a coding task (positive or negative outcome)
- When a tool call produces unexpected results
- After a test failure or deployment issue
- When the user explicitly wants to record feedback

## How it works

Use the `capture_feedback` MCP tool with:

- **signal** — `"thumbs_up"` or `"thumbs_down"`
- **context** — Description of what happened and why when the user already said it clearly
- **tags** — Array of relevant tags for categorization (e.g., `["test-failure", "refactor"]`)
- **chatHistory** — Up to 8 prior recorded entries plus the failed tool call when the thumbs-down signal is vague and the lesson must be distilled from recent context
- **relatedFeedbackId** — Use when the user adds clarifying detail later and it should refine the existing feedback event
- **rubric_scores** — Optional object with structured quality scores

## Example

```
Capture feedback: thumbs_down for the failed database migration.
Context: Migration script dropped the wrong index, causing query timeouts.
Tags: database, migration, production-incident
```

## Vague signal recovery

If the user only says `thumbs_down`, `wrong`, `correct`, or `this failed`, do not stop there. Call `capture_feedback` with:

- the signal
- any minimal context the user already gave
- `chatHistory` containing up to 8 prior recorded entries from the current correction thread
- the failed tool call or command when available
- `relatedFeedbackId` if the user is clarifying an already-open 60-second follow-up session

That lets ThumbGate propose `whatWentWrong`, `whatToChange`, and a candidate rule automatically.

Feedback feeds into the prevention rule promotion pipeline. Repeated failures with the same pattern are automatically promoted into enforceable prevention rules.

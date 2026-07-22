---
name: capture-feedback
description: Quick feedback capture with structured signals.
---

# Capture Feedback

Quickly capture structured feedback about the current task or action.

## Usage

Invoke this command to record a feedback signal with context and tags. If the user only gives a quick `thumbs_down`, `wrong`, or `correct`, the command should still call `capture_feedback` and pass recent context through `chatHistory`.

## Steps

1. Specify signal: `thumbs_up` or `thumbs_down`.
2. If the user already gave a clear explanation, pass it as `context`.
3. If the explanation is vague or omitted, gather up to 8 prior recorded entries plus the failed tool call into `chatHistory`.
4. Add tags for categorization.
5. If this is a later clarification for an existing feedback event, include `relatedFeedbackId`.
6. Call the `capture_feedback` MCP tool and show the proposed lesson or corrective rule back to the user.

## Example

```
/capture-feedback thumbs_down "Tests broke after migration" database,migration
```

```
/capture-feedback thumbs_down
```

In the second example, the command should rely on history-aware distillation instead of refusing the signal outright. If the user adds more detail later, reuse `relatedFeedbackId` so the linked 60-second follow-up session updates the same record.

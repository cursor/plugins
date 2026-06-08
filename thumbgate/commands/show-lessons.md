---
name: show-lessons
description: Display promoted lessons and their corrective actions.
---

# Show Lessons

Display promoted lessons from the project's ThumbGate memory along with their corrective actions and linked prevention rules.

## Usage

Invoke this command to review what the system has learned from past failures.

## Steps

1. The command calls the `search_lessons` MCP tool to retrieve all active promoted lessons.
2. Results are displayed with:
   - Lesson description
   - Corrective action
   - Linked prevention rules (if any)
   - Lifecycle state (active, archived, superseded)

## Example

```
/show-lessons
```

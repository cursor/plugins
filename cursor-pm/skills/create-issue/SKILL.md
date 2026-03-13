---
name: create-issue
description: Turn a bug report, feature request, or TODO comment into a tracked issue using the cursor-pm MCP server.
---

# Create issue

## Trigger

You encounter a bug, a missing feature, or a TODO in the codebase and want to track it as a formal issue.

## Required Inputs

- Issue title (concise, imperative)
- Issue type (`bug`, `feature`, `chore`, `docs`)
- Optional: description, affected file(s), reproduction steps, priority

## Workflow

1. Gather context: file path, line numbers, and a short description of the problem or request.
2. Call `pm_create_task` with:
   - `title`: imperative summary (e.g. "Fix null pointer in auth middleware")
   - `type`: `bug` | `feature` | `chore` | `docs`
   - `description`: context, reproduction steps, or acceptance criteria
   - `priority`: `low` | `medium` | `high`
   - `labels`: relevant tags (e.g. `["auth", "crash"]`)
3. Return the created task ID and a direct link if available.

## Guardrails

- One issue per distinct problem — do not bundle unrelated concerns.
- For bugs, always include reproduction steps or a failing test reference.
- For features, include acceptance criteria in the description.

## Output

- Created issue ID and title
- Priority and type
- Link to the issue (if the MCP server returns one)

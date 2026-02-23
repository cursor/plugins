---
name: manage-tasks
description: Create, update, list, and close project tasks using the cursor-pm MCP server. Use when you need to track work items for the current project.
---

# Manage tasks

## Trigger

You need to create, update, list, or close tasks for the current project.

## Workflow

1. List existing tasks with `pm_list_tasks` to understand current state.
2. For new tasks, call `pm_create_task` with a title, optional description, priority, and assignee.
3. To update a task status, call `pm_update_task` with the task ID and new status (`open`, `in-progress`, `done`).
4. To close a task, call `pm_close_task` with the task ID.
5. Summarise the current task board after any mutation.

## Guardrails

- Always list tasks before creating duplicates.
- Keep task titles concise and action-oriented.
- Set priority (`low`, `medium`, `high`) based on impact and urgency.

## Output

- Current task list with statuses
- IDs of any created or updated tasks
- Next recommended action

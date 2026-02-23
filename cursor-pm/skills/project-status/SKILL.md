---
name: project-status
description: Get a snapshot of the current project's health — open tasks, blockers, and recent activity — using the cursor-pm MCP server.
---

# Project status

## Trigger

You need a quick summary of where the project stands: what is open, what is blocked, and what was recently completed.

## Workflow

1. Call `pm_project_summary` to retrieve aggregate counts by status.
2. Call `pm_list_tasks` filtered to `status=open` and `priority=high` to surface blockers.
3. Call `pm_list_tasks` filtered to `status=done` with a recent date range to show completed work.
4. Compose a concise status report.

## Output

- Total open / in-progress / done counts
- High-priority open tasks (potential blockers)
- Recently completed tasks (last 7 days)
- One-line overall health assessment

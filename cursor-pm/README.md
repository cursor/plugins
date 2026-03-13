# Cursor PM

Project management MCP server for Cursor. Provides tools for managing tasks, tracking project status, and creating issues directly from the editor.

## Features

- **Task management** — create, update, list, and close tasks without leaving Cursor
- **Project status** — instant health snapshot: open tasks, blockers, and recent completions
- **Issue creation** — turn bugs, TODOs, and feature requests into tracked issues

## MCP server

The plugin registers the `cursor-pm` MCP server, which exposes the following tools:

| Tool | Description |
|:-----|:------------|
| `pm_list_tasks` | List tasks with optional filters (status, priority, assignee) |
| `pm_create_task` | Create a new task or issue |
| `pm_update_task` | Update a task's status, priority, or assignee |
| `pm_close_task` | Close a task by ID |
| `pm_project_summary` | Return aggregate counts by status |

Task data is stored locally in `${workspaceFolder}/.cursor/pm` by default. Override the location with the `PM_DATA_DIR` environment variable.

## Skills

| Skill | Description |
|:------|:------------|
| `manage-tasks` | Create, update, list, and close project tasks |
| `project-status` | Get a snapshot of project health |
| `create-issue` | Turn a bug or feature request into a tracked issue |

## Installation

Install via the Cursor plugin marketplace or clone this repository and add the plugin to your `.cursor-plugin/marketplace.json`.

## License

MIT

---
name: recall-context
description: Recall relevant past failures, prevention rules, and context packs before starting a coding task.
---

# Recall Context

Retrieve relevant historical context before beginning work on a coding task.

## When to use

- Starting a new coding task or feature
- Before making changes to code that has failed before
- Resuming work from a previous session

## How it works

Use the `recall` MCP tool to retrieve:

1. **Prevention rules** — Rules auto-promoted from repeated failure patterns that apply to the current task.
2. **Past failures** — Specific failure events with context, tags, and corrective actions.
3. **Context packs** — Bundled project context from previous sessions.

## Example

```
Use the recall MCP tool to check for known issues with the authentication module before refactoring.
```

The tool returns structured context that helps avoid repeating past mistakes and surfaces corrective actions from promoted lessons.

# OrgX Execution Control Plane

Use this skill when working inside Cursor with OrgX active.

## Goal

Keep Cursor work anchored to OrgX workstreams, decisions, proof, and execution state instead of ad-hoc chat history.

## Workflow

1. Fetch or refresh bootstrap context.
2. Prefer resume over create when relevant work already exists.
3. Keep tool usage and edits tied to a specific workstream or task.
4. Surface blockers and pending decisions explicitly.
5. Close with proof, artifacts, and concrete next actions.

## Guardrails

- Do not invent work that is not grounded in the active OrgX context.
- Do not call work complete without verification.
- Keep repo-local `.cursor/orgx/` overlays additive to the plugin defaults.

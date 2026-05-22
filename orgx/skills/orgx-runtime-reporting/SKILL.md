---
name: orgx-runtime-reporting
description: Use when Cursor should report progress, artifacts, blockers, or completion state back to OrgX during a live task.
---

# OrgX Runtime Reporting

Use this skill when Cursor should keep OrgX updated during execution.

## Reporting contract

There are two reporting paths:

- **Active path:** call OrgX MCP tools during the work when you know the
  initiative, task, decision, blocker, or artifact context.
- **Passive backstop:** Cursor lifecycle hooks record compact session events for
  later Work Graph reconciliation.

Do not treat hook presence as a substitute for intentional OrgX writes. Hooks
answer whether OrgX was used; MCP calls make the work durable in OrgX while the
session is still fresh.

## Workflow

1. Resolve available IDs from args, env, or the current OrgX context:
- `ORGX_INITIATIVE_ID`
- `ORGX_WORKSTREAM_ID`
- `ORGX_TASK_ID`
- `ORGX_RUN_ID`
- `ORGX_CORRELATION_ID`

2. Emit activity at meaningful milestones:
- `intent`
- `execution`
- `handoff`
- `blocked`
- `completed`

3. Register proof of work:
- When you produce a file, diff, document, screenshot, or report, register it as
  an artifact with a concrete summary.

4. Handle blockers structurally:
- If judgment is required, request a decision with explicit options.
- If context is missing, report the exact missing dependency.

5. Close execution cleanly:
- When the task is complete and verified, emit completion activity and update
  entity state if the task ID is available.

6. If no OrgX IDs are available:
- Continue the work, but make the final response easy for the hook reconciler to
  classify: name decisions, artifacts, blockers, next actions, and verification.
- Do not claim OrgX was updated unless an MCP tool or API call actually
  succeeded.

7. Preserve Work Graph continuity:
- When a Work Graph report is generated, include its `work_graph_fingerprint`
  and `signup_hydration.hydration_key` in summaries or artifacts that are safe
  to store.
- Treat the fingerprint as the durable claim key that lets OrgX hydrate
  pre-signup audit value into a user's future workspace.
- Never derive the fingerprint from secrets or raw transcripts that would need
  to leave the local machine.

## Quality bar

- Never post empty status updates.
- Messages must be evidence-based and specific.
- Include OrgX IDs whenever available.
- Use `source_client=cursor`.
- Preserve secrets: never emit tokens, cookies, API keys, or storage state into
  activity, retro, hook summaries, or final reports.

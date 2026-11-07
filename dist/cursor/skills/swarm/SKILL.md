---
name: swarm
description: "Use for /swarm, substantial independent coverage slices, or bounded races. Aggregate worker evidence and report gaps without automatic high-cost fan-out."
---

# Swarm

Read [the cursor adapter](../../docs/harness/cursor.md) before this skill.

Read [the core](../../docs/core.md) and the current client adapter.
Keep a checklist: Frame, Workers, Aggregate, Report.

## Frame

Define the done predicate, required coverage, and worker reports. Choose disjoint
slices or declare a race rule (`first pass`, `rank all`, or `best-of`).
Use exploration for readers, implementation for writers, verification for tests,
and review for explicit multi-model races. A task one worker can finish should
not fan out merely because this skill is present.

## Workers

Honor configured total/concurrent limits. Brief each worker with scope, input
revision/patch, goal, verification command/method, and stop condition. Isolate
writers in separate worktrees; serialize if isolation is unavailable.
Never substitute local worktrees for cloud-agent execution.

## Aggregate

Read terminal reports. Require named SHAs and methods when the brief calls for
them. An incomplete report or dropout is a gap, not PASS. Retry only within
the configured worker/cost budget. Required coverage gaps are BLOCKED.

## Report

Return one consolidated table of PASS, ISSUES, or BLOCKED, verified issues,
gaps, actual/unknown models, and the race rule when used.

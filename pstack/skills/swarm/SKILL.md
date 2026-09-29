---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

Fan out N parallel cloud workers. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

## Start

Open a todolist with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is total workers, not the cloud concurrency limit.
4. Pick the worker entry from the matching harness profile using [model routing](../../docs/model-routing.md). Writers use native subagents unless the user explicitly selected isolated external writers. With no profile, use the legacy `swarm workers` line or `grok-4.7-xhigh-fast` in Cursor; in another harness use native `inherit-parent`. For `auto` or `inherit-parent`, omit native `model`. Report rejected slugs and use a confirmed fallback. For a model race, name each arm's runner and model up front.
5. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Spawn native workers with the active harness's subagent tool. In Cursor, use one message with `subagent_type: generalPurpose`, `environment: "cloud"`, and `run_in_background: true`, leaving `model` unset for `auto` or `inherit-parent`; use `environment: "local"` only when computer access is needed. An explicitly selected external worker uses its confirmed runner and its own checkout; drain it with the native workers before ranking results.

When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and rerun that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.

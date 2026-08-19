---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
metadata:
  pstack-explicit-invocation: "true"
---

**Activation boundary:** execute this skill only when the user or another active pstack skill explicitly routes here.

# Swarm

Fan out N parallel workers. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

## Start

Use the host's task tracker with one entry per phase before launching anything. If no tracker is available, keep the same short checklist in the working response.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is total workers, not the host's concurrency limit.
4. Use the confirmed `swarm workers` mapping from `~/.config/pstack/models.md` when present. Otherwise inherit the parent model. For a model race, name each arm's confirmed model up front. Never invent an identifier or claim a model race when all arms inherited the same model.
5. Give each worker its own writable output when it writes. Use a worktree, branch, or `/tmp/swarm-<slug>/worker-<n>/`.

## Phase B: Fan out

Launch all N workers concurrently through the host's native delegation feature. Prefer isolated or remote workers when the host provides them and the task does not need local-only state. Use local workers when the task needs files, credentials, devices, or runtime state available only on this machine. If concurrent or remote delegation is unavailable, run workers sequentially or locally and report the limitation.

When a worker must start from a non-default pushed branch, include that branch in the brief using the host's supported checkout mechanism.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.

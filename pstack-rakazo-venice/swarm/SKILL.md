---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

## Start

Open a scratchpad (`scratchpad_add`) with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Pick the worker model from the `swarm workers` line in the `pstack-models` rule (the bot-memory entry `/setup-pstack` writes, or `~/.cursor/rules/pstack-models.mdc` on the bot's computer). If the rule or that line is missing, use `default_code`@high. For `inherit-parent`, omit `model_provider` and `model_id` so the workers run on the parent model. If `run_subagent` or Venice rejects an id, use the default and say so. If it rejects the default, use the closest valid id of the same family from the live catalog. For a model race, name each arm's model up front. Pick each subagent's reasoning level for the job, per the Subagents section of the **poteto-mode** skill.
4. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Launch all N workers in one message as cloud agents with `cloud_agent_launch` (prompt, repository, `openPr`) <!-- TODO(rakazo): cloud_agent_launch takes no model, so the step 3 model cannot be applied to cloud workers; it uses the cloud provider's default --> . Use `run_subagent` with the step 3 model (`model_provider` + `model_id`, left unset for `inherit-parent`) only when the worker needs access to something on the user's computer <!-- TODO(rakazo): confirm helpers inherit the parent's `user_computer_*` tools -->.

When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

## Phase D: Report

Return one consolidated in-chat report with a result table, issue one-liners, gaps or dropouts, and the race rule when used.

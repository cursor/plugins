---
name: swarm
description: Explicitly fan out parallel Codex workers across slices or race arms, drain them, and return one evidence-backed report.
---

# Swarm

Fan out N parallel workers across separate slices, identical race briefs, or a mix. The parent waits for every required result, aggregates evidence, and returns one report.

## Start

Use Codex's plan tool for Frame, Fan out, Aggregate, and Report.

## Frame

1. State the done predicate and output.
2. Choose coverage, race, or mixed shape. For a race, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or the real number of independent slices. Respect the session's concurrency limit; queue later batches rather than inventing cloud capacity.
4. Route by work type, all at `xhigh`: Spark (`gpt-5.3-codex-spark`) for bounded micro-edits, Luna (`gpt-5.6-luna`) for high-volume search/extraction/live verification/repetition, Terra (`gpt-5.6-terra`) for ordinary features/refactors/bugs/reviews, and Sol (`gpt-5.6-sol`) for architecture, complex bugs, performance, hill-climbing, synthesis, and judging. A model-comparison panel uses all four and a separate Sol cross-judge.
5. Give every writing worker an exclusive output path or file set. Agents share the same filesystem and must not edit or revert one another's work.

## Fan out

Call `spawn_agent` for every worker in the current batch without waiting between calls. Use the matching `pstack_*` custom agent when installed; otherwise pin the model with `reasoning_effort: "xhigh"` and `fork_turns: "none"`. Each self-contained brief includes goal, scope, exact slice or race arm, ownership, verification, and report format. Require `PASS`, `ISSUES`, or `BLOCKED` with evidence.

Drain workers with long `wait_agent` calls. A wait timeout is not a dropout. Use `followup_task` for a bounded correction or missing check on an existing worker. Do not invent background IDs, resume operations, cloud environments, cloud branches, or undocumented agent states.

If a worker actually fails, proceed with the remaining results only when the done predicate still holds; otherwise replace that slice and name the failure.

## Aggregate

For coverage, every required slice needs a result. For a race, apply the declared rule. For a model panel, wait for all available arms, then run the separate Sol cross-judge. Read actual artifacts and evidence; do not paste raw worker dumps or accept self-reports without inspection.

## Report

Return one compact result table, one-line evidenced issues, explicit gaps/dropouts, and the selection rule when a race was used.

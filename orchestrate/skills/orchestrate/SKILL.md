---
name: orchestrate
description: Use only when the user explicitly types `/orchestrate <goal>` to decompose a large task, spawn a tree of parallel cloud-agent workers/subplanners/verifiers via the Cursor SDK, and collect structured handoffs; do not invoke autonomously.
disable-model-invocation: true
---

# Orchestrate

An explicit `/orchestrate <goal>` fans out a large task across parallel Cursor cloud agents. Workers don't talk to each other; they talk up through structured handoffs. The spawn, wait, and handoff loop lives in `scripts/cli.ts`. The planner writes `plan.json`, the script executes it, and the planner reads handoffs to decide what comes next. Long-running agent loops drift; a script with a JSON state file keeps its footing.

**Required reading: the `cursor-sdk` skill ([cursor/plugins/cursor-sdk](https://github.com/cursor/plugins/tree/main/cursor-sdk)).** Spawning, auth, and the error taxonomy live there. Don't reimplement what that skill already documents.

## Setup

- `CURSOR_API_KEY` must be a personal/user key. Create it from [Cursor Dashboard > Integrations](https://cursor.com/dashboard/integrations), then read `cursor-sdk` Auth before using it.
- `SLACK_BOT_TOKEN` is optional. When set, pass `--slack-channel <id>` to `kickoff` or the first `run --root`, or set `SLACK_CHANNEL_ID`. The script stores the channel in `plan.slackChannel`, posts the kickoff thread there, mirrors task status, and reads Andon reactions. When the token is unset, the script logs once and runs without Slack visibility; correctness does not change.

## Core principles

These rules make the tree self-converging without global coordination.

1. **Planners own scopes and publish tasks. They do no coding.** Writing `plan.json`, reading handoffs, and deciding what's next are planner work. Editing files, running `git merge`, and fixing conflicts inline are not. If a planner feels the urge to code, it publishes a task for a worker instead.
2. **Planners don't know who picks up their tasks.** The script routes each task to a cloud agent. The planner's mental model stays at the task level.
3. **Workers are isolated.** One task, one clone of the repo, no channel to any other agent. One handoff when done.
4. **Subplanners are recursive planners.** A planner publishes a "subplan this slice" task; the subplanner fully owns that slice and hands back an aggregated handoff.
5. **Continuous motion via handoffs.** A planner that thought it was done can receive a late handoff and replan. No "finished" state until the planner decides to stop publishing.
6. **Propagation, not synchronization.** No cross-talk between siblings. No shared state between levels. Each level sees only its children's handoffs.

## Node types

| Node           | Runs the loop? | Scope                            | Output                                  |
| -------------- | -------------- | -------------------------------- | --------------------------------------- |
| Planner        | yes            | Entire user goal                 | User-facing message + optional PR       |
| Subplanner (↻) | yes            | One slice of parent's scope      | Handoff to parent                       |
| Worker         | no             | One concrete task                | Handoff to spawning planner             |
| Verifier       | no             | One target's acceptance criteria | Verdict handoff to spawning planner     |
| Git            | n/a            | Shared medium                    | Branches (code) + handoffs/ (meaning)   |

## Role

Two roles, one skill. Read your role's reference file and skip the other.

**Dispatcher.** You're in a local IDE session and the user typed `/orchestrate <goal>`. Your job is to kick off a cloud root planner and return its URL. See `references/dispatcher.md`. One-shot; you are not the planner.

**Planner (root or sub).** You were spawned with a structured prompt that opens with "You are the root planner for:" or "You are a subplanner for:". Or the user chose to run the planning loop locally. You own a scope, publish tasks, read handoffs, decide what's next. See `references/planner.md`.

`disable-model-invocation: true` means this skill loads only on explicit invocation.

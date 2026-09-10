---
name: goal
description: Run an explicit goal with on-demand subagents. Use when the user sets a goal and asks to delegate tasks, or requests the cost-efficient GPT agent tree. Own integration and verification at the root.
---

# Goal

Split useful work. Spawn only roles that advance the goal.

## Model selection

Use these defaults for this workflow. Explicit user choices and configured `goal` roles override this table. Other workflow model defaults do not override it.

| Role | Model | Reasoning effort | Responsibility |
| --- | --- | --- | --- |
| goal root | gpt-6-astra | medium | Scope, delegate, integrate, verify |
| goal explorer | gpt-5.6-luna | max | Bounded repository investigation |
| goal worker | gpt-5.6-sol | high | Implementation and relevant tests |
| goal researcher | gpt-5.6-luna | max | Focused lookup with sources |
| goal reviewer | gpt-6-astra | xhigh | Independent review when justified |

Check the session's available models and spawn schema before dispatch. In Codex `collaboration.spawn_agent`, pass `model` and `reasoning_effort` separately, with `fork_turns: "none"` and a self-contained brief. Full-history forks cannot accept overrides. In a `Task` harness, use its supported model selection fields and only confirmed model identifiers. Never invent a slug by appending the effort. If a requested model or effort is unavailable, report it and request a replacement before dispatching that role. Continue independent local work meanwhile. Never substitute Sonnet.

The root row is a session preference. A skill cannot change the running root's model or effort. Report any known mismatch and continue on the current root unless the user requires an exact match. Do not spawn a second orchestrator to simulate switching the root.

## Run the goal

1. State the outcome, constraints, and smallest checks that will prove completion. When the user explicitly requests a persistent goal, use the harness goal tool if available. Reuse an existing active goal that already covers the work. Set a token budget only when the user supplies one. Without a goal tool, track the objective in the current plan and state that it is session-local.
2. Identify independent tasks with concrete outputs. Keep short or tightly coupled work at the root. Spawn an explorer for an unanswered repository question, a researcher for external facts, or a worker for an implementation unit. A task needing only implementation gets no automatic explorer or researcher. Respect the harness concurrency limit and reserve useful integration or investigation work for the root.
3. Give each child the objective, relevant paths, permitted writes, constraints, dependencies, completion check, and expected report. Require evidence, unresolved questions, and changed paths where applicable. Explorers and researchers are read-only. Workers own disjoint files or isolated worktrees. Children return to the root without spawning descendants unless the root explicitly assigns further delegation.
4. Collect completions as they arrive and unblock dependent work. Read the actual diff or cited evidence before accepting a report. Reuse a worker for a correction with a refreshed brief. After repeated failure, reassess the premise or narrow the task before spending another attempt. Stop obsolete children when the goal changes.
5. Integrate at the root and run the selected checks against the combined result. Root edits are allowed. Worker self-reports do not establish completion. For this workflow, this delegation policy replaces mandatory feature fan-out, automatic arena panels, and the long-running Orchestrate coordinator's prohibition on editing code. Explicitly requested specialist workflows still apply.
6. Request the reviewer only for a concrete unresolved risk, such as concurrent state changes, a security boundary, conflicting evidence, or a user-requested independent review. Name the risk first. Give the reviewer the objective, constraints, final diff, and raw evidence without the worker's verdict. Require findings with file references and a way to verify each claim. Resolve supported findings and rerun affected checks.
7. Complete the authorized delivery only after the outcome and checks pass. Mark a persistent goal complete only then, using the harness's goal lifecycle rules. Report the result, evidence, material limits, and remaining action. If blocked, preserve the outstanding work and name the missing input without claiming completion.

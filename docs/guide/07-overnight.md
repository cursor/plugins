---
title: Run bounded unattended work
description: Define completion, budget, permissions, and a safe handoff.
---

## Establish the contract

Unattended work needs observable completion, a budget, isolation, and a stop
condition. A local worktree does not keep an agent running after its host exits.
Cursor loops and cloud services are optional, client-specific facilities.
GitHub cloud-agent execution is not supported by this plugin.

```text
/poteto-mode migrate callers to the new parser in an isolated local worktree.
done means no old callers and all parser fixtures pass.
at most two workers, one hour of authorized execution.
keep a local decision trail. do not commit, push, open a PR, or merge.
stop on missing required tools, the budget, or my pause; return a resume capsule.
```

Use the [autonomous-run playbook](../../skills/poteto-mode/playbooks/autonomous-run.md).
Verify supported wake/background tools first. Without persistent execution,
do the bounded current-session work and hand off. Never claim that a process
will survive a closed laptop or host shutdown.

## Iterate and verify

Each iteration makes the smallest justified change, verifies the exact outcome,
and records meaningful evidence. Undo only this run's unsuccessful edits.
Do not reinterpret the goal, increase the budget, or commit merely because the
user stepped away. [Pause safely](../../skills/poteto-mode/playbooks/pause-safely.md)
preserves uncommitted work and leaves a capsule without automatic publishing.

## Audit the result

[Show me your work](../../skills/show-me-your-work/SKILL.md) records decisions
outside installed plugin content. Validate the trail against actual session
evidence. Transcript-file mining is opt-in and scope-limited; without access,
disclose that limitation. Independent review is bounded and must report actual
model/tool provenance, never an assumed cross-family reviewer.

## Coordinate a queue

[Autopilot-full](../../skills/poteto-mode/playbooks/autopilot-full.md) coordinates
approved independent changes with scoped owners and evidence-based verification.
[Autopilot-stack](../../skills/poteto-mode/playbooks/autopilot-stack.md) stops at
verified handoff and never merges.
[Orchestrate](../../skills/poteto-mode/playbooks/orchestrate.md) handles a genuine
multi-task dependency graph within configured total/concurrent worker limits.
Commit, PR, push, and merge permissions remain separate from execution.

## Optional automation

The dormant [Cursor automation pack](../../automations/benny/README.md) can
support approved event-driven triage and reproduction. Enable the integration
only when that service and its required tools are available. Required project
verification must not depend on the pack. No automation is installed or enabled
by setup.

Next: [Steer with principle names](./08-principles.md).

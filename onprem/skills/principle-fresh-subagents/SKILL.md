---
name: principle-fresh-subagents
description: "Apply to every subagent spawn for a role round in the on-prem stack. Fresh subagent with consolidated scope by default. Resume only for state that lives in that agent. Interrupt-chained resumes drop directives."
disable-model-invocation: true
---

# Fresh Subagents

Give each role round a fresh subagent that carries the consolidated scope. Reuse a running agent only when the new work needs state that lives in that agent.

**Why:** On-prem models are worse at resuming a partially-compressed context than frontier ones. An interrupt-chained resume — send a follow-up to an agent that was stopped or held — silently drops earlier directives, and the model fills the gap by assuming rather than asking. A fresh agent with the whole brief, every later directive, and the prior agent's report does not have that gap.

How to apply:

- **Fresh by default.** A fix round, a follow-up, a retry, and the next queue item each get a new `onprem-agent` (or role-specific subagent) with the consolidated scope: the original brief, every directive since, and the prior agent's report and branch.
- **The consolidated scope is the brief.** It is not "continue what you were doing." It is the full state the new agent needs, written out.
- **Reuse only for resident state.** Resume or reuse when the work needs what lives in that agent: its local checkout, its uncommitted changes, or a process it still runs (a dev server, a watcher). A stop or hold order is not a reason to reuse.
- **A role outlives its agent.** Once an agent returns, a fresh agent takes the role's next round. Do not trust a "done" summary as the whole prior state.

The tell of a drifted resume is a subagent that acts on a directive from three rounds ago that was superseded, because the superseding message never reached it. Fresh-with-consolidated-scope is the fix, not a stricter prompt to the same agent.

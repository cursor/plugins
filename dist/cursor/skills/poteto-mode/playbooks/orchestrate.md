---
description: "Coordinate a bounded program of independently verifiable tasks"
---

# Orchestrate

Read [the shared policy](../../../docs/core.md) and the current client adapter.

Use this for a genuine multi-task program, not a single continuous trace.

1. Define the outcome, dependencies, file boundaries, verification evidence,
   budget, and granted side effects. Keep state in host-supported session
   storage or an approved project data directory, never the installed plugin.
2. Start with one representative unit. Verify its kickoff, implementation,
   and result before scaling out.
3. Resolve each worker's role through the shared configuration. Use the
   adapter's actual delegation tool, not a hardcoded cross-client tool name.
   Respect both total worker and simultaneous execution limits. If independent
   writers cannot be isolated in supported worktrees, serialize them.
4. Give each independent task a fresh worker and a self-contained brief.
   Name paths it can change, actions it cannot take, prerequisite results,
   completion evidence, and stop conditions. One writer owns each branch.
   Reuse a worker only for a same-task follow-up.
5. Verify artifacts and exact checks, not just status text. Risky changes get
   independent read-only review with confirmed tools and identities. The
   parent verifies runtime hypotheses. Report family diversity only when
   actual execution metadata supports it.
6. Track every worker to completion, cancellation, or an explicit handoff.
   On failure, diagnose and narrow the task; retry only within the authorized
   budget. Stop repeated stalls rather than spawning an unbounded hierarchy.
7. Hold commits, publishing, PR creation, and merging unless explicitly
   authorized. Follow [shipping](./shipping.md) for approved delivery.
   Host event subscriptions are optional; unsupported persistent execution
   requires a handoff, not an invented project store or cloud runtime.

**Reply:** completed units and evidence, active or cancelled workers, remaining
dependencies, verified delivery state, and decisions or blockers.

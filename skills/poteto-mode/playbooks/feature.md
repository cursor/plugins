---
description: "Feature"
---

### Feature

Read [the shared policy](../../../docs/core.md) and the current client adapter first. Its scope gates, model routing, worker limits, and required-capability rules govern this playbook. Personal-style cleanup and external integrations are optional; historical large-fan-out recipes require explicit approval.

Own the design, implementation result, and verification. Delegate only substantial independent work.

1. `how` over the affected subsystem.
2. `architect` when the design has consequential uncertainty.
3. Write the throughput checkpoint as four todo items. A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
   - **Blocking first steps.** Gates run before fan-out.
   - **Independent workstreams.** Disjoint files, services, or layers parallelize. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (the **separate-before-serializing-shared-state** principle skill). Serialize only for real invariants.
   - **Smallest safe decomposition.** If one worker is best, name why.
4. Implement directly for a cohesive small change. Otherwise delegate a bounded independent scope using the implementation role, named files/data shape, verification, and stop condition. Use arena only when competing designs justify it. Preserve useful comments and local changes. Keep dependent callers consistent.
5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass. Flag it.
6. Deliver small verifiable units. Commit or rebase only when authorized.
7. If the design is contested, `interrogate` before shipping.
8. Run **Opening a PR** only if requested.

Code-coupled work (one feature, one migration) goes to a single owner with the checkpoint inline. That owner fans out internally after the blocking phase. Parent-level fan-out is for slices that produce independent artifacts (audits, cross-subsystem investigations, competing experiments). Rewrite the checkpoint at phase boundaries. Spawn a fresh owner rather than chaining interrupts.

**Reply:** what you built, what you chose and why, the throughput checkpoint, open decisions. Tables for design alternatives.

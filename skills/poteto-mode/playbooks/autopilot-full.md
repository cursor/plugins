---
description: "Deliver an approved multi-change program with bounded verification"
---

# Autopilot-full

Read [the shared policy](../../../docs/core.md) and the current client adapter.

1. **Confirm the grant.** State the queue, outcome, budget, allowed local
   changes, and separately approved external actions. Planning is not a go.
   Items without merge authorization stop at verified handoff.
2. **Assign bounded owners.** One writer owns each independent change.
   Resolve implementation roles before launch. Use supported local worktree
   isolation for concurrent writers; otherwise serialize. Record owner IDs,
   file scope, dependencies, and progress outside the plugin.
3. **Build and prove the change.** Reproduce first, preserve behavior, and
   run the project's checks on the intended head/base. Open or publish a PR
   only when authorized, following [opening a PR](./opening-a-pr.md).
   Personal comment removal, Bugbot, and external cleanup plugins are optional
   and never replace verification.
4. **Verify independently where justified.** Follow the bounded
   [swarm workflow](../../swarm/SKILL.md), using project test/driver tools.
   Reviewers remain read/search-only; runtime verification belongs to a
   permitted execution lane or the parent. A missing required check blocks,
   while an irrelevant optional integration is disclosed as skipped.
   Inspect exact evidence and head provenance before accepting a verdict.
5. **Deliver only the verified result.** Green CI alone is not permission to
   merge. Recheck relevant merge-result behavior when trunk or dependencies
   changed, then follow [shipping](./shipping.md) within the explicit grant.
   No silent force-pushes, check bypasses, or operator approval substitutes.
6. **Supervise within the budget.** Use supported events or finite checks;
   a persistent Cursor loop is optional, not portable infrastructure.
   On stalls, diagnose and bound retries. Report a blocker when the host
   cannot continue. On hold, stop new writes and account for every worker.

**Reply:** verified changes and commands, actual PR/delivery state, independent
review provenance, skipped optional capabilities, blockers, and handoff steps.

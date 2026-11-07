---
description: "Autonomous run"
---

### Autonomous run

Read [the shared policy](../../../docs/core.md) and the current client adapter first. Its scope gates, model routing, worker limits, and required-capability rules govern this playbook. Personal-style cleanup and external integrations are optional; historical large-fan-out recipes require explicit approval.

**You own the exit condition. Define done, then drive to it without stopping.**

1. State the exit condition as a checkable predicate before the first iteration (tests green, repro fixed, all N PRs merged, pixel-diff zero).
2. Agree on an iteration/time budget and a supported wake mechanism. Host events or a finite watcher can observe external changes; Cursor `/loop` is optional and not available in every client. Without persistent execution support, perform the bounded local iterations and hand off. Resolve any necessary worker through the shared role configuration.
3. Each iteration makes the smallest change the evidence justifies and verifies it against the predicate. Commit only with explicit authorization. Undo only this run's unsuccessful changes, never unrelated user work.
   Sequence the work via the **sequence-verifiable-units** principle skill, verifying each unit before the next instead of batching checks at the end.
4. Fix root causes and tightly coupled blockers. Keep unrelated discoveries as follow-ups rather than expanding scope or opening unrequested PRs. Ask for consequential product decisions, unavailable required capabilities, or additional side-effect authorization.
5. Checkpoint every iteration via the **show-me-your-work** skill, a row for what changed and whether the predicate moved.
6. Stop when the predicate is met, the budget is exhausted, the user pauses, or a required capability is unavailable. Try evidence-based alternatives within the budget. Never relax the predicate or conceal an incomplete outcome.

**Reply:** the exit condition, iterations run, what landed, what was discarded, final predicate state.

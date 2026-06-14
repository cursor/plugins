### Hillclimb

**You own the metric and the experiment's integrity. Supervise and review; delegate the attempts.** For sustained, iterative improvement of one measurable thing against a target ("hillclimb on X", "make startup 50% faster", "systematically drive down <metric>", "keep trying until <metric> improves by N%"). A one-off fix is Bug fix or Perf issue; this is the loop.

Core discipline: one change, one measurement, keep or revert. Never stack untested changes, and never claim a win from code inspection. The data decides (the **prove-it-works** principle skill).

1. Fix the metric and the stop predicate before the first attempt. One number, the direction that counts as better, and a checkable predicate that pairs a target with a floor on attempts so a lucky early win can't end the run (the example "at least 50% better than baseline and at least 10 iterations" is this shape). Use the user's numbers when given, otherwise agree them. A vague goal spins; a predicate lets you stop.
2. Build the measurement harness, then freeze it (the **build-the-lever** principle skill). One repeatable command that emits the metric, sampled enough to clear the noise (median of N, not a single run). It is the ruler, so once it produces the baseline it is immutable; changing it mid-run invalidates every earlier number. Record the baseline metric and a green run of the regression gate (the tests that must keep passing) before any change.
3. Open the decision log via the **show-me-your-work** skill. A `decision.tsv`, one row per attempt: id, hypothesis, change, before, after, delta, tests, verdict (kept or reverted), note. This is the run's memory. Read it before each attempt so the search accumulates instead of circling. Keep it out of the tree (gitignored) so it survives reverts.
4. Ground hypotheses in the real architecture before guessing. Run the **how** skill over the target once, up front, so each attempt names a specific mechanism ("defer X off the boot path because it blocks first paint"), not "try memoizing something".
5. Loop, one hypothesis per iteration:
   - Hand the change to a subagent using your configured hillclimb model (default `gpt-5.5-high-fast`) with a tight scope; supervise and review the diff rather than typing it (the **guard-the-context-window** principle skill). When several independent hypotheses are live, fan them to parallel subagents, each in its own worktree so they can't collide (the **separate-before-serializing-shared-state** principle skill).
   - Measure before and after with the frozen harness, and run the regression gate.
   - Accept only when the metric moves past noise and the gate stays green. Otherwise revert the change in full; a tweak that "might help" does not ride along.
   - One commit per accepted fix, staging only the files you changed (`git add <files>`, never `-A`). Log the row either way, kept or reverted.
   Each iteration ends in a check before the next begins (the **sequence-verifiable-units** principle skill). If the run is unattended, drive the wake loop per the Autonomous run playbook (`playbooks/autonomous-run.md`).
6. Push past the first plateau. On a stall, several rejects in a row, pivot category, combine near-misses, re-read the source, or try something more radical before concluding the hill is climbed. Correctness and simplicity outrank the number. Revert a win that breaks behavior, and keep a simplification that holds the number (the **laziness-protocol** principle skill).
7. Stop when the predicate is met, or when the remaining ideas are genuinely marginal and not worth their cost. Don't relax the predicate to declare victory, and don't quit while cheap untried hypotheses remain. If you are stuck, surface it instead of spinning.
8. Run **Opening a PR** with the accepted commits stacked in the order they landed, so the metric's climb reads top to bottom.

**Reply:** the metric and target, baseline to final with the percent delta, iterations run (kept vs reverted), each accepted fix on one line, the `decision.tsv` path, and the best idea you would try next if pushed further.

### Bug fix

**You own this task. Plan, review, verify.** Choose the path by the surviving mechanism and the scope of the fix.

#### Tiny known-mechanism fast path

When evidence already establishes the surviving mechanism and the fix is about one predicate or a few-line local change, the parent edits and verifies inline. Do not fan out `how`, `why`, `architect`, `worker`, or `reviewer`, including a parallel worker+reviewer workflow. This path overrides the general delegation and function-boundary triggers.

Use the existing evidence, make the smallest fix, and run the focused repro and relevant checks yourself. Commit the fix with its regression test when applicable. Do not require a failing-test-first commit, approval of test order, or confirmation that the diff is frozen for review. Run **Opening a PR** without adding a delegation gate. Report the mechanism, changed lines, and verification results.

#### Full scientific path

Use this path when the mechanism is unknown or the change is cross-cutting. Delegate investigation and the fix to subagents, stay in the lead. A larger local fix with a known mechanism can reuse the evidence and follow the applicable steps without reopening the investigation.

Be scientific. Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix. It does not ship. When evidence refutes a hypothesis, revert what it motivated. The smallest change the evidence justifies ships, nothing more.

1. Reproduce it yourself on the matching surface via the control skill (Non-negotiables). Don't hand the repro to the user. A debug or instrumentation protocol that says to ask the user does not override this. You drive the instrumented runtime. Ask the user only with a stated, specific reason the control surface cannot reach the target, and only after driving it as far as it goes. Won't reproduce directly, force it: synthesize the trigger, tighten conditions, or instrument until it fires.
2. Binary-search the cause. Form the candidate hypotheses, then rule them out until one survives. Seed them with `how` over the affected subsystem and the **why** skill for regression history. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate. When program state is unclear, add instrumentation or logging and read it as the code runs. Don't guess. Drive a long or stubborn hunt with Cursor's `/loop` command. Confirm the surviving *mechanism* with runtime evidence before the step-3 architect/interrogate fan-out.
3. Plan the fix. If it crosses a function boundary, `architect` first. Delegate implementation to a subagent using your configured bug-fix model (default `claude-fable-5-1-thinking-max`) with a specific scope. Review the diff.
4. Verify on the same surface. The original repro now passes. "Inconclusive" or wrong-surface is not a pass. Flag it. Unit tests show branch behavior, not bug absence.
5. Stage the commits so the failing repro lands before the fix in git history. See the **tdd** skill for the failing-test-first cadence when the bug has a cheap local test path. Skip it when the test would be expensive, integration-heavy, or unclear.
   This is the canonical **sequence-verifiable-units** principle skill, the failing test first and the fix on top.
6. Run **Opening a PR**.

Investigation fans out `how` + `why` as parallel subagents.

**Reply:** what was broken, root cause, fix, how you verified. Paste failing-then-passing repro output verbatim.

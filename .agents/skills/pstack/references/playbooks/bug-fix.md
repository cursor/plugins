# Bug fix

Use this when the user reports a defect and wants it diagnosed and fixed.

Every shipped line traces to runtime evidence. A change that "might help" is a hypothesis, not a fix, and does not ship. When evidence refutes a hypothesis, revert what it motivated.

1. Reproduce the defect yourself on the relevant surface. Record the exact steps and result. Ask the user to reproduce only with a specific reason you cannot reach the target. If it won't reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
2. Binary-search the cause. Form candidate hypotheses, then rule them out with runtime evidence until one survives. When program state is unclear, add logging and read it as the code runs. Don't guess.
3. Make the smallest change the evidence justifies. If the change affects a broader interface, settle the shape and callers before editing.
4. Verify the original reproduction now passes on the same surface. "Inconclusive" or wrong-surface is not a pass. Say so.
5. When the bug has a cheap local test path, commit the failing test before the fix so history shows failing, then passing. Skip it when the test would be expensive or unclear, and say why.
6. Review the diff for unrelated edits. Apply the usage budget's reviewer rule.

**Reply:** what was broken, root cause, fix, how you verified. Paste the failing-then-passing repro output verbatim.

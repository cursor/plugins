---
name: principle-the-algorithm
description: >-
  Apply to any non-trivial change before designing it. Make the requirement
  less dumb, delete, optimize, accelerate, automate, in that order, then run
  it again on the result. The reply names the requirement you questioned and
  what you deleted.
disable-model-invocation: true
---

# The Algorithm

Five steps, in order, for any change bigger than an edit you can see at a glance. The order is the principle. Each step is cheap only after the one before it, and the common failure is doing a late step on something an early step would have removed. Adapted from Elon Musk's five-step engineering process.

1. **Make the requirements less dumb.** Assume the requirement is wrong and make it less wrong. It comes from a person, not a department. "The ticket", "the linter", "the reviewer", or "the old code did it" is a source, not a reason; find the person and their reasoning. If you do not agree with the reasoning, do not accept the requirement, however smart the person who gave it, the human included. No is a valid outcome.
2. **Delete the part or process step.** Try hardest to delete the part, flag, layer, retry, or step entirely before touching step 3. Optimizing something that should not exist is the biggest mistake smart people make. If you never add anything back, you did not delete enough. Leaf: pstack `principle-subtract-before-you-add`.
3. **Optimize** what survived. Third step, not first. Have one part do many things instead of a parallel copy per caller. Look hardest at boundaries between owners and layers, where a wrapper wraps a wrapper. Leaves: pstack `principle-laziness-protocol`, `principle-minimize-reader-load`.
4. **Accelerate.** Be the part: walk one change through edit, build, check, and review yourself and note where you wait, crawl, or bounce. Tighten that. Leaf: pstack `principle-sequence-verifiable-units`.
5. **Automate** last, or you automate something that should not exist. Volume alone does not justify it; precision and reviewability do. pstack `principle-build-the-lever` still applies. It runs on what survived.

**Run it again.** This is not a one-time gate. Rerun it on the result before you ship; the second pass deletes more.

**The tell.** A citation of this principle names the requirement you made less dumb, who owned it, and what you deleted. A citation with neither means you skipped it.

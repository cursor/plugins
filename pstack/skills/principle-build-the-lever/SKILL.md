---
name: principle-build-the-lever
description: "Apply when work is repetitive or bulk: many similar edits, a check you'll rerun, a population to transform, a fan-out to subagents. Build the tool that amortizes it (codemod, script, generator, or a skill your subagents follow) once you know the recipe, instead of grinding by hand."
disable-model-invocation: true
---
# Build the Lever

When the work repeats, build the tool that does it instead of grinding by hand.

**Why:** Doing the same edit a hundred times is slow and drifts into inconsistent mistakes. A codemod, generator, or script does it once, the same way every time, reruns for free, and gives a reviewer one artifact to check.

**Pattern:** When you would otherwise repeat a transform, a check, or a setup more than a handful of times, build the lever instead.

- Do the first few by hand to learn the exact recipe, then build the tool. Don't build on a guess.
- Codemod or script for bulk edits, generator for repetitive files, a dump-to-sqlite query for repeated analysis, a rerunnable check for repeated verification.
- When you fan work out to subagents, write the lever as a skill they all read: the recipe, the verification contract, and the do-not-touch fences in one artifact, so every delegate inherits the same hardened version instead of re-explaining it per prompt and watching each one drift. Harden it the moment a delegate games or drops the contract, then re-dispatch. Keep it outside the delegates' write scope so they can't quietly edit the contract.
- Commit it when the work outlives the session, so the next run reruns it instead of redoing it.

**Balance:** Leverage, not gold-plating. The [Laziness Protocol](../principle-laziness-protocol/SKILL.md) still holds. Build the lever only when it pays for itself across the remaining work, never for a one-off.

Distinct from [Encode Lessons in Structure](../principle-encode-lessons-in-structure/SKILL.md), which makes a recurring instruction a durable guardrail. This is throughput on the work in front of you.

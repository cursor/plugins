---
name: principle-separate-before-serializing-shared-state
description: "Explicitly invoked skill: activate ONLY when the user explicitly writes /principle-separate-before-serializing-shared-state (or names 'principle-separate-before-serializing-shared-state') in their message, or when another pstack skill routes to it; never auto-activate on ordinary prompts. Apply when concurrent actors might write to the same file, branch, key, or state object. Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant."
---

# Separate Before Serializing Shared State

When concurrent actors might write the same file, branch, key, or object, first ask whether they need one shared object or are publishing independent facts. Default to giving each actor its own file, key, branch, or state directory, and merge only where the state is read. Two workers writing their own field into one `state.json` is still shared mutation.

Only when one shared write target is a real invariant, serialize access structurally (a lockfile, a single writer, sequential phases, compare-and-swap). Instructions are not concurrency control, and "we need a lock" is a smell to check first.

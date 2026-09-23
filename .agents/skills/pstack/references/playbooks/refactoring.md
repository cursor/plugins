# Refactoring

Use this for a behavior-preserving change to structure, names, or module boundaries. The structure changes. The behavior does not.

If the cleanup reveals a missing feature or a real bug, split it out and ship the structural change first against the pinned contract.

1. Pin the behavior contract before any structure moves. Trace callers, then write a characterization test, snapshot, or equivalence check that captures current behavior. If the area has no coverage, write the pin first. Type check and lint are not a pin.
2. Name the structural problem and the simpler target shape. Keep existing structure when it is already clear and local. The reshape must delete branches or invalid states, not add indirection.
3. Remove dead code and redundant layers before adding new structure. For an API change, migrate every caller and delete the old path in the same change. No compatibility shims.
4. Move in small steps, each keeping the pin green. Spot-check every rename against the actual files, including strings and docs.
5. Prove behavior is unchanged on the real artifact, not "it compiles". For larger reshapes, diff old and new outputs.
6. Confirm the change reduces reader load somewhere. If it doesn't, revert it. Apply the usage budget's reviewer rule.

**Reply:** the structure that changed, the pin you held it against, the equivalence proof, and what shipped or got reverted.

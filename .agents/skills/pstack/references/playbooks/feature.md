# Feature

Use this for new behavior or a meaningful change to existing behavior.

1. Read the relevant project instructions and trace the current behavior and affected callers.
2. State the user-visible outcome and the central data shape or domain concept before editing. Resolve choices that only the user can make; use evidence or a small prototype for factual uncertainties.
3. For a new data shape or public API, sketch two structurally distinct designs and compare them before choosing. Then work in small steps, verifying each one before starting the next.
4. Implement the smallest complete design. Keep validation at external boundaries and let internal types carry established invariants.
5. Verify the feature through the user-facing behavior and relevant project checks. Review the full diff for omissions and unrelated changes, then apply the usage budget's reviewer rule.
6. Report what changed, the key design choice, and the verification performed.

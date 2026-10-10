# Native iOS interfaces

Follow the product's existing iOS conventions first, then Apple platform conventions. A native interface should feel predictable before it feels distinctive.

## Structure and controls

- Use a navigation stack for hierarchy, a tab bar for a small set of top-level destinations, and sheets for self-contained tasks.
- Preserve the edge-swipe back gesture and safe-area behavior.
- Prefer native controls, materials, menus, alerts, sheets, pickers, and text behavior unless the product already has a coherent custom system.
- Keep touch targets comfortable, text scalable, labels accessible, and focus order sensible.
- Account for the keyboard, long content, dynamic type, reduced motion, dark mode, and device insets.

## States

Include the states the task requires: loading, empty, error, success, permission denied, offline, disabled, and recovery where applicable. Feedback should be immediate and should not depend on color alone.

When a simulator or runnable build is available, inspect the relevant device classes and fix observable clipping, overlap, unsafe-area violations, unreadable text, broken navigation, or inaccessible controls. Recheck the affected state after fixes. If the environment cannot run the UI, disclose that visual/device verification remains incomplete instead of requiring unavailable tooling.

For an explicit Uizze Overdrive request, combine this guidance with [Overdrive](overdrive.md). Use native continuity and responsive feedback, not web-only effects or novelty that interferes with platform navigation. Respect Reduce Motion and preserve an equally usable non-animated path.

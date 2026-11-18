---
name: principle-laziness-protocol
description: "Explicitly invoked skill: activate ONLY when the user explicitly writes /principle-laziness-protocol (or names 'principle-laziness-protocol') in their message, or when another pstack skill routes to it; never auto-activate on ordinary prompts. Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem."
---

# Laziness Protocol

- **Consolidate decisions.** Do not repeat the same choice in several places. Put it behind one source of truth and pass the result as a simple flag.
- **Minimize the diff.** Make the smallest change that solves the problem. Fewer lines beat "elegant" boilerplate.

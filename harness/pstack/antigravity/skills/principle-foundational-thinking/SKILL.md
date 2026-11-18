---
name: principle-foundational-thinking
description: "Explicitly invoked skill: activate ONLY when the user explicitly writes /principle-foundational-thinking (or names 'principle-foundational-thinking') in their message, or when another pstack skill routes to it; never auto-activate on ordinary prompts. Apply before writing logic: choosing core types and data structures, sequencing scaffold-vs-feature work, asking what concurrent actors share. Get the data structures right so downstream code becomes obvious."
---

# Foundational Thinking

Get the data shape right before writing logic. Define core types early, trace every access pattern, and choose structures that match the dominant paths. DRY the structure, not every line.

Before sharing state between actors, ask what happens if another actor modifies it concurrently. If the answer is not "nothing", isolate.

Scaffold first. Whatever helps every later phase (CI, tests, shared types) goes first, after removing dead code. Keep commits small and single-purpose.

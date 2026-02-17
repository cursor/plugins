---
name: learn-rule
description: Capture a correction or lesson as a persistent learning rule. Use after making a mistake or when the user says "remember this".
---

# Learn Rule

Capture a lesson from the current session into permanent memory.

## Trigger

Use when the user says "remember this", "add to rules", or after a mistake is identified.

## Workflow

1. Identify the lesson - what mistake was made? What should happen instead?
2. Format as: `[LEARN] Category: One-line rule`
3. Categories: Navigation, Editing, Testing, Git, Quality, Context, Architecture, Performance
4. Propose the addition and wait for user approval.
5. After approval, persist to LEARNED section.

## Output

```
[LEARN] Category: Rule text
Mistake: What went wrong
Correction: How it was fixed
```

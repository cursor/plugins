---
name: setup-pstack
description: Configure which models pstack uses per role. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Write `~/.cursor/rules/pstack-models.mdc`, an always-applied rule that sets pstack's model per role. The skills read it and fall back to their inline defaults when a line is absent, so this is an override layer, not a requirement.

`inherit-parent` and `auto` are aliases. Either value means omit `model` from the Task call so the subagent inherits the parent chat model. Auto-plan users can use either value to stay on Auto. Do not invent an Auto Task slug.

## Steps

### 1. Detect available models

Enumerate the model slugs you can pass to a `Task` subagent in this session; that is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. If you cannot detect any real slugs, still offer `inherit-parent` / `auto` and ask the user to paste any real slugs they want to use. The aliases are always valid and do not need to appear in the detected slug set. Never write a real slug you have not confirmed is available.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.cursor/rules/pstack-models.mdc` already exists, read it and treat its values as the current choices. Otherwise start from those defaults.

### 3. Map and confirm

Show every role with its current model, marking any real slug that is not in the detected set as needing a choice. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` / `auto` as options. Label the aliases as "inherit parent chat model (Auto)." Prefer AskQuestion over free text. For panel roles (how critics, arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one entry from it whose family differs from the parent's when possible.

### 4. Validate

Require detected-set membership only for real slugs. `inherit-parent` and `auto` always pass validation. If a chosen real slug is not available, stop and ask again. A rule pointing at a model the user cannot use breaks every delegation that reads it.

### 5. Write the rule

Write `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true` and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```
---
description: pstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# Resolve each role value before every Task spawn:
# - a real model slug → pass it as Task `model`
# - `inherit-parent` or `auto` → OMIT the `model` field entirely so the subagent inherits the parent chat model
# - never substitute a skill's inline default when the role line is set to inherit-parent/auto
# Panel roles (lists): inherit-parent/auto on every entry keeps fan-out count but loses model diversity (all runners share the parent model). That is intentional for Auto-only users.
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
feature, refactoring: grok-4.5-fast-xhigh
bug-fix: gpt-5.6-sol-max
perf-issue: gpt-5.6-sol-max
hillclimb: gpt-5.6-sol-max
judgment and prose: claude-fable-5-thinking-max
hardest tasks: claude-fable-5-thinking-max
how explorer: grok-4.5-fast-xhigh
how explainer: claude-fable-5-thinking-max
how critics: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.5-fast-xhigh
why investigators: grok-4.5-fast-xhigh
why synthesizer: claude-fable-5-thinking-max
reflect tooling: gpt-5.6-sol-max
reflect judgment, divergent, synthesizer: claude-fable-5-thinking-max
arena runners: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.5-fast-xhigh
arena cross-judge pool: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.5-fast-xhigh
architect runners: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.5-fast-xhigh
interrogate reviewers: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.5-fast-xhigh
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed — workspace, user, or plugin). On no, move on without pushing.

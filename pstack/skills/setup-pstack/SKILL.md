---
name: setup-pstack
description: Configure which models pstack uses per role. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Write `~/.cursor/rules/pstack-models.mdc`, an always-applied rule that sets pstack's model per role. The skills read it and fall back to their inline defaults when a line is absent, so this is an override layer, not a requirement.

## Steps

### 1. Detect available models

Enumerate the model slugs you can pass to a `Task` subagent in this session; that is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a slug you have not confirmed is available.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.cursor/rules/pstack-models.mdc` already exists, read it and treat its values as the current choices. Otherwise start from those defaults.

### 3. Map and confirm

Show every role with its current model, marking any whose model is not in the detected set as needing a choice. Ask whether to accept as-is or change specific roles, offering the detected models as the options. Prefer AskQuestion over free text. For panel roles (how critics, arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per model, so the list length sets the count.

### 4. Validate

Every slug written must be in the detected set. If a chosen slug is not available, stop and ask again. A rule pointing at a model the user cannot use breaks every delegation that reads it.

### 5. Write the rule

Write `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true` and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```
---
description: pstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
feature, refactoring: composer-2.5-fast
bug-fix: gpt-5.5-high-fast
perf-issue: gpt-5.5-high-fast
hillclimb: gpt-5.5-high-fast
judgment and prose: claude-fable-5-medium-thinking
hardest tasks: claude-fable-5-thinking-max
how explorer: composer-2.5-fast
how explainer: claude-fable-5-medium-thinking
how critics: claude-fable-5-medium-thinking, gpt-5.5-high-fast, composer-2.5-fast
why investigators: composer-2.5-fast
why synthesizer: claude-fable-5-medium-thinking
reflect tooling: composer-2.5-fast
reflect judgment, divergent, synthesizer: claude-fable-5-medium-thinking
arena runners: claude-fable-5-medium-thinking, gpt-5.5-high-fast, composer-2.5-fast
architect runners: claude-fable-5-medium-thinking, gpt-5.5-high-fast, composer-2.5-fast
interrogate reviewers: claude-fable-5-medium-thinking, gpt-5.5-high-fast, composer-2.5-fast
```

Add `# fallback: claude-opus-4-8-thinking-high` on judgment roles; J3 E3 uses `claude-fable-5-low-thinking` per dispatch-rubric overlay.

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

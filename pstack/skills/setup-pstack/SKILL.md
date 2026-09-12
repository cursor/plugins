---
name: setup-pstack
description: Configure which models pstack uses per role and how much reasoning effort they get. Detects your available models, asks for a budget, and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.cursor/rules/pstack-models.mdc`, an always-applied rule that sets pstack's model per role. A budget sets the reasoning effort for every role at once. You can then change any single role.

## Steps

### 1. Detect available models

Enumerate the model slugs you can pass to a `Task` subagent in this session. That is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.cursor/rules/pstack-models.mdc` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults.

### 3. Budget, map, and confirm

Work in this order.

**(a) Ask for a budget.** Prefer AskQuestion over free text. Offer these four options, in this order and with these exact labels. When the current rule records a budget, name it in the question as the current one.

- `unlimited — keep max`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

The budget sets one target effort for every real slug. `unlimited` keeps each slug at the effort it has. `large` targets `xhigh`, `medium` targets `high`, and `small` targets `medium`.

**(b) Apply the budget.** Build the working table from the skill defaults. On a re-run, a role whose current value differs from the default in more than effort tokens (a different family, an alias, or a different list) is your earlier choice, so carry it over. Then rewrite every real slug in the table, each entry of a panel list on its own.

The effort ladder is `max` > `xhigh` > `high` > `medium` > `low`. The effort token is the last token of a slug, or the token before a trailing `fast`. Replace it with the target. The rest of the slug is the family. It includes flags such as `thinking` and `fast`, and it does not change. A `cursor-` prefix and the position of `fast` do not change the family, so `grok-4.6-fast-xhigh` and `cursor-grok-4.6-xhigh-fast` are one family. If the rewritten slug is not in the detected set, use the detected slug of the same family with the highest effort at or below the target. If the family has no detected slug at or below the target, keep the slug and mark the role as needing a choice. `inherit-parent`, `auto`, and a slug with no effort token do not change. The budget sets the effort rather than capping it, so a re-run with a larger budget raises the table and a re-run with a smaller budget lowers it.

| default and `unlimited` | `large` | `medium` | `small` |
|---|---|---|---|
| `claude-fable-5-1-thinking-max` | `claude-fable-5-1-thinking-xhigh` | `claude-fable-5-1-thinking-high` | `claude-fable-5-1-thinking-medium` |
| `grok-4.6-fast-xhigh` | `grok-4.6-fast-xhigh` | `grok-4.6-fast-high` | `grok-4.6-fast-medium` |
| `gpt-5.6-sol-max` | `gpt-5.6-sol-xhigh` | `gpt-5.6-sol-high` | `gpt-5.6-sol-medium` |
| `claude-opus-5-thinking-xhigh` | `claude-opus-5-thinking-xhigh` | `claude-opus-5-thinking-high` | `claude-opus-5-thinking-medium` |

When only the `cursor-grok-4.6-<effort>-fast` form is detected, the grok row lands on `cursor-grok-4.6-xhigh-fast`, `cursor-grok-4.6-high-fast`, and `cursor-grok-4.6-medium-fast`. When a family skips a tier, the next detected tier down applies. A `gpt-5.6-sol` set with only `max` and `medium` gives `gpt-5.6-sol-medium` for `large`, `medium`, and `small`.

**(c) Show the roles and confirm.** Show every role with its model from the working table, marking any real slug not in the detected set as needing a choice. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer AskQuestion over free text. A model you pick here is written as you pick it, with no budget rewrite. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.

### 5. Write the rule

Write `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true`, one `# budget` line, and one line per role, using the same labels poteto-mode uses. The `# budget` line records the label you chose and its target effort, so a re-run can show it. Overwrite the whole file so re-runs stay idempotent. Shape:

```
---
description: pstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit Task `model`). Alias entries in a panel list still count toward its fan-out.
# budget: unlimited (max)
feature, refactoring: grok-4.6-fast-xhigh
bug-fix: grok-4.6-fast-xhigh
perf-issue: grok-4.6-fast-xhigh
hillclimb: grok-4.6-fast-xhigh
judgment and prose: claude-fable-5-1-thinking-max
hardest tasks: claude-fable-5-1-thinking-max
how explorer: grok-4.6-fast-xhigh
how explainer: claude-fable-5-1-thinking-max
why investigators: grok-4.6-fast-xhigh
why synthesizer: claude-fable-5-1-thinking-max
reflect tooling: gpt-5.6-sol-max
reflect judgment, divergent, synthesizer: claude-fable-5-1-thinking-max
arena runners: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
arena cross-judge pool: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
swarm workers: grok-4.6-fast-xhigh
architect runners: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
interrogate reviewers: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

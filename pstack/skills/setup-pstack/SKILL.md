---
name: setup-pstack
description: Configure which models pstack uses per role, and where its skills look for transcripts, worktrees, and installed skills. Detects your available models and host tool, then writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "configure pstack environment", or changing pstack's model choices.
---

# Setup pstack

Write `~/.cursor/rules/pstack-models.mdc`, an always-applied rule that sets pstack's model per role and records the host environment in an `[environment]` section. The skills read it and fall back to their inline defaults when a line or section is absent, so this is an override layer, not a requirement.

## Steps

### 1. Detect available models

Enumerate the model slugs you can pass to a `Task` subagent in this session; that is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 6 below. If `~/.cursor/rules/pstack-models.mdc` already exists, read it and treat its values — model lines and any `[environment]` section — as the current choices. Otherwise start from those defaults.

### 3. Map and confirm

Show every role with its current model, marking any real slug not in the detected set as needing a choice. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer AskQuestion over free text. For panel roles (how critics, arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set; `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again. A rule pointing at a model the user cannot use breaks every delegation that reads it.

### 5. Detect the environment

Detect the host tool this session runs on (`cursor`, `opencode`, `claude-code`, or another), then resolve four directories for it: where per-workspace chat transcripts live (`transcripts_dir`), where git worktrees are created (`worktrees_dir`), where project-local skills are installed (`skills_output_dir`), and this config file's own absolute path (`rules_file`). On Cursor these default to `~/.cursor/projects`, `.cursor/worktrees`, `.cursor/skills`, and `~/.cursor/rules/pstack-models.mdc`; on other hosts take them from what the session actually exposes and confirm anything unclear with the user. On re-runs the freshly detected host is authoritative for `tool`: update the line rather than silently keeping a stale value.

### 6. Write the rule

Write `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true`, one line per role using the same labels poteto-mode uses, and the `[environment]` block detected in step 5. Overwrite the whole file so re-runs stay idempotent. Shape:

```
---
description: pstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit Task `model`). Alias entries in a panel list still count toward its fan-out.
feature, refactoring: grok-4.6-fast-xhigh
bug-fix: gpt-5.6-sol-max
perf-issue: gpt-5.6-sol-max
hillclimb: gpt-5.6-sol-max
judgment and prose: claude-fable-5-thinking-max
hardest tasks: claude-fable-5-thinking-max
how explorer: grok-4.6-fast-xhigh
how explainer: claude-fable-5-thinking-max
how critics: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
why investigators: grok-4.6-fast-xhigh
why synthesizer: claude-fable-5-thinking-max
reflect tooling: gpt-5.6-sol-max
reflect judgment, divergent, synthesizer: claude-fable-5-thinking-max
arena runners: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
arena cross-judge pool: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
swarm workers: grok-4.6-fast-xhigh
architect runners: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
interrogate reviewers: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh

# Host environment. Skills read these paths instead of assuming Cursor's layout.
[environment]
tool              = cursor
transcripts_dir   = ~/.cursor/projects
worktrees_dir     = .cursor/worktrees
skills_output_dir = .cursor/skills
rules_file        = ~/.cursor/rules/pstack-models.mdc
```

Bundled scripts cannot read this file. `poteto-mode/scripts/worktree-audit.sh` instead honors `PSTACK_TRANSCRIPTS_DIR`: set it to the transcript directory to search, verbatim; unset, the script keeps its built-in Cursor default (`~/.cursor/projects/<slug>/agent-transcripts`). Mention this variable whenever you customize `[environment].transcripts_dir`.

### 7. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed — workspace, user, or plugin). On no, move on without pushing.

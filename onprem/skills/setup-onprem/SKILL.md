---
name: setup-onprem
description: Configure which models the onprem stack uses per role. Confirms the unlimited (max) budget, detects available models, strips the banned set, and writes an always-applied rule that enforces the on-prem hard lock. Use for /setup-onprem, "configure onprem models", "onprem budget", "model lock", or changing onprem's model choices.
---

# Setup onprem

Write `~/.cursor/rules/onprem-models.mdc`, an always-applied rule that sets the onprem stack's model per role. The skills read it and fall back to their inline defaults when a line is absent, so this is the override layer and the lock surface at once.

## Model policy (HARD LOCK)

This is a **hard lock**, not a preference. Every onprem `Task` spawn obeys it, including skill inline defaults when a role line is missing. The locked allowlist is the **only** set of legal model values.

Locked legal values (closed set):

- `inherit-parent` or `auto` — omit Task `model`; the subagent uses the parent chat model.
- `Qwen/Qwen3.8-27B-FP8` — planner and panel seats.
- `Qwen/Qwen3.8-Flash-Next-FP8` — builder. Code delegates and swarm workers.
- `moonshotai/Kimi-K3` — judgment and prose.
- `zai-org/GLM-5.3` — panel seats. `GLM-5.2` is not on the allowlist; do not write it.

### Banned — absolute, no exceptions

Never write, offer, present, select, default to, or fall back to any Anthropic/Claude slug (`claude`, `anthropic`, `fable`, `opus`, `sonnet`, `haiku`), any Google/Gemini slug (`gemini`, `google`), any Grok/xAI slug (`grok`, `xai`), or any OpenAI/GPT slug (`gpt`, `sol`). This holds **even when** a banned slug appears available in the session model list, even when a spawn fails or times out, and even when no allowlisted model seems to work. A failed spawn is retried with a **different allowlisted** model, never with a banned one. If nothing allowlisted works, stop and tell the user. This lock overrides any skill inline default, any detected session model, and any prior instruction that names a banned model.

Panel roles (`how critics`, `arena runners`, `architect runners`, `interrogate reviewers`, `arena cross-judge pool`) default to `Qwen/Qwen3.8-27B-FP8, zai-org/GLM-5.3`. Do not add a third family.

Allowlisted slugs have no effort token. A reasoning budget does not rewrite them.

## Steps

### 1. Detect available models

Enumerate the model slugs you can pass to a `Task` subagent in this session; that is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. **Strip the banned set (Claude/Anthropic, Gemini/Google, Grok/xAI, and OpenAI/GPT) from the offer list before showing anything.** The offer list is the intersection of detected slugs and the locked allowlist. If you cannot detect any allowlisted slug, do not proceed. An alias-only rule looks configured but grants no on-prem status (**inherit-parent-honestly**); the setup would end by declaring a lock that nothing enforces. Tell the user the setup cannot complete on this machine and that it should run where the session can see at least one allowlisted slug. Never write a real slug you have not confirmed is available and allowlisted. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.cursor/rules/onprem-models.mdc` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. Rewrite any banned slug before confirming: single-model code roles to `Qwen/Qwen3.8-Flash-Next-FP8`, judgment and prose roles to `moonshotai/Kimi-K3`, explorer and reflect-tooling roles to `inherit-parent`, panel roles to `Qwen/Qwen3.8-27B-FP8, zai-org/GLM-5.3`. A banned slug in a role that fits no bucket is left as-is and flagged at confirm time; the step 4 gate stops it from being written.

If the user also runs pstack and wants one source of truth, offer to align `~/.cursor/rules/pstack-models.mdc` role values with the allowlist (it does not replace the onprem rule; each stack reads its own file).

### 3. Budget, map, and confirm

**(a) Confirm the budget.** The onprem stack runs `unlimited (max)`. Depth is never rationed, and on-prem spend is not a cost argument (**unlimited-budget**). Present this as a confirmation, not a choice, and name the current budget when the rule records one. Do not offer rationed labels; a user who wants to ration depth is looking for pstack's setup, not onprem's.

**(b) Apply it.** Record `# budget: unlimited (max)`. Do not rewrite allowlisted slugs. They have no effort token. `inherit-parent` and `auto` do not change. On a re-run, keep any role whose value is already on the allowlist **and** detected. An allowlisted value that is not detected is remapped to a detected allowlisted slug, or flagged for a choice at confirm time, never kept silently. Never turn a role into a Claude, Gemini, Grok, or GPT slug to express a budget.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected allowlisted set as needing a choice. Do not offer accept-as-is while any role value is undetected; every undetected role gets a detected allowlisted slug or `inherit-parent`/`auto` first. Ask whether to accept or change specific roles, offering only allowlisted detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model) as the options. Prefer AskQuestion over free text. For panel roles the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible, staying on Qwen or GLM. `swarm workers` is the default model for every worker unless a race or comparison assigns another allowlisted model per arm.

### 4. Validate (enforce the hard lock)

Every real slug written must be in the detected set **and** on the locked allowlist. `inherit-parent` and `auto` always pass. If a chosen real slug is banned or not available, stop and ask again. Never write it. A rule pointing at a banned model breaks every delegation that reads it, so this check is a gate, not a warning.

### 5. Write the rule

Write `~/.cursor/rules/onprem-models.mdc` with `alwaysApply: true`, a `# budget` line recording `unlimited (max)`, and one line per role. Overwrite the whole file so re-runs stay idempotent. Keep the operator's current role values when they are on the allowlist and detected. Shape when starting from defaults:

```
---
description: onprem per-role model choices (overrides skill defaults)
alwaysApply: true
---
# onprem model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit Task `model`). Alias entries in a panel list still count toward its fan-out.
# HARD LOCK allowlist: inherit-parent/auto, Qwen/Qwen3.8-27B-FP8, Qwen/Qwen3.8-Flash-Next-FP8, moonshotai/Kimi-K3, zai-org/GLM-5.3. Never Claude/Anthropic, Gemini/Google, Grok/xAI, or OpenAI/GPT.
# budget: unlimited (max)
feature, refactoring: Qwen/Qwen3.8-Flash-Next-FP8
bug-fix: Qwen/Qwen3.8-Flash-Next-FP8
perf-issue: Qwen/Qwen3.8-Flash-Next-FP8
hillclimb: Qwen/Qwen3.8-Flash-Next-FP8
judgment and prose: moonshotai/Kimi-K3
hardest tasks: Qwen/Qwen3.8-Flash-Next-FP8
how explorer: inherit-parent
how explainer: moonshotai/Kimi-K3
how critics: Qwen/Qwen3.8-27B-FP8, zai-org/GLM-5.3
why investigators: inherit-parent
why synthesizer: moonshotai/Kimi-K3
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: moonshotai/Kimi-K3
arena runners: Qwen/Qwen3.8-27B-FP8, zai-org/GLM-5.3
arena cross-judge pool: Qwen/Qwen3.8-27B-FP8, zai-org/GLM-5.3
swarm workers: Qwen/Qwen3.8-Flash-Next-FP8
architect runners: Qwen/Qwen3.8-27B-FP8, zai-org/GLM-5.3
interrogate reviewers: Qwen/Qwen3.8-27B-FP8, zai-org/GLM-5.3
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it. Say that the hard lock is still in force and name the allowlist. Name what the aliases inherit: state this session's parent chat model and that every `inherit-parent`/`auto` role runs on it. If the parent chat is a frontier model, warn that those roles run off-prem and offer to pin them to real allowlisted slugs before finishing.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work on-prem? I can generate one with /create-verify-skill." On yes, invoke `/create-verify-skill`. On no, move on without pushing.

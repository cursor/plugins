---
name: principle-closed-allowlist
description: "Apply to any model value in the on-prem stack. The legal set is closed: inherit-parent/auto, Qwen/Qwen3.8-27B-FP8, Qwen/Qwen3.8-Flash-Next-FP8, moonshotai/Kimi-K3, zai-org/GLM-5.3. Everything else is an invalid value, not a weaker one."
disable-model-invocation: true
---

# Closed Allowlist

The set of legal model values is closed. Anything not in it is an invalid value, not a weaker alternative to fall back on.

**Why:** A hard lock only works as a closed set. If the legal values are "these and whatever else is available," the lock has no edge and every future model is an argument. A closed set turns "is this allowed?" into a yes/no lookup.

The legal values, in full:

- `inherit-parent` or `auto` — omit the Task `model`; the subagent runs on the parent chat model.
- `Qwen/Qwen3.8-27B-FP8`
- `Qwen/Qwen3.8-Flash-Next-FP8`
- `moonshotai/Kimi-K3`
- `zai-org/GLM-5.3`

Two checks, both required before a value is used:

1. Is it in the closed set above? If not, it is invalid — do not use it.
2. If it is a real slug, is it available in this session? The aliases always pass.

Adding a model to the set is an explicit, user-approved edit to the rule file, never a runtime decision. The allowlist line in `~/.cursor/rules/onprem-models.mdc` and in `/setup-onprem` are the only places the set is named. Keep them in agreement.

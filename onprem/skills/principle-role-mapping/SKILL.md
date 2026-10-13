---
name: principle-role-mapping
description: "Apply to any delegation, subagent spawn, or panel seat in the on-prem stack. Each role pins to an allowlisted model from the rule file, and the skill's own inline defaults are themselves locked."
disable-model-invocation: true
---

# Role Mapping

Every role in the on-prem stack maps to an allowlisted model. The mapping lives in one place: `~/.cursor/rules/onprem-models.mdc`, written by `/setup-onprem`. The skills read it and fall back to their inline defaults only when a role line is absent — and those defaults are locked to the allowlist too.

**Why:** If role-to-model were decided at spawn time, the lock would be only as strong as the moment. A fixed mapping, overridable by the rule file, means the on-prem choice is a property of the configuration, not of a run. And if the inline defaults themselves could name a frontier model, the fallback path would leak the ban.

Default role mapping (what a fresh rule file contains):

```
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

Rules:

- A role line in the file overrides the default. A role with no line keeps its default.
- A line of `inherit-parent` or `auto` runs that role on the parent chat model (see **inherit-parent-honestly**).
- Panel roles are a list; one subagent runs per entry. Keep them to the two on-prem families (**panel-composition**).
- No role may map to a banned slug. A value must pass the closed-allowlist check and the availability check before it is written (**validation-gate**).

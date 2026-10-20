---
name: principle-panel-composition
description: "Apply to any diverse-model review, panel, or cross-judge in the on-prem stack. Two on-prem families, no third; the cross-judge picks a family different from the parent when possible."
disable-model-invocation: true
---

# Panel Composition

A panel in the on-prem stack uses the two on-prem families. No third family joins, and the cross-judge differs from the parent.

**Why:** The value of a multi-model panel is independent perspectives, and the value here specifically is that the perspectives are *on-prem* ones. Adding a frontier model to a panel reintroduces exactly what the lock removes, through the back door of "diversity." Two distinct on-prem families give real diversity while staying inside the closed set.

Composition rules:

- Panel seats default to `Qwen/Qwen3.8-27B-FP8` and `zai-org/GLM-5.3`. One subagent runs per seat.
- Do not add a third family to a panel. Two distinct on-prem voices are the panel; a third is scope creep against the lock.
- The cross-judge (the seat that picks a winner or names parts to merge) takes a family **different from the parent chat's model** when possible, staying on Qwen or GLM. If the parent is already a Qwen model, the cross-judge is GLM, and vice versa.
- `arena cross-judge pool` is also a list, but Arena selects one value from it whose family differs from the parent when possible.

A panel that accidentally includes a banned or third-family model is not a bigger panel. It is a lock violation. Remove the seat and re-run with on-prem families only (**banned-set**, **closed-allowlist**).

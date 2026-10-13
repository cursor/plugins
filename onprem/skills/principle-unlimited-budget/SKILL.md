---
name: principle-unlimited-budget
description: "Apply to any cost, effort, or token-budget question about the on-prem stack. The budget is unlimited (max). Reasoning depth is not rationed, because on-prem spend is not a user-facing cost argument."
disable-model-invocation: true
---

# Unlimited Budget

The on-prem stack runs at unlimited (max) reasoning budget. Depth is not rationed.

**Why:** The usual reason to cap reasoning is cost. On a self-hosted on-prem stack the marginal token is not a per-request bill a user pays, so the standard cost argument does not apply. Rationing depth to save tokens you do not pay per use produces weaker work for no real saving, and a weak on-prem finish is exactly the thing the lock is trying to make good.

Consequences:

- Record `# budget: unlimited (max)` in the rule file. Do not rewrite allowlisted slugs to encode a budget; they carry no effort token.
- Do not choose a smaller model or a shallower pass to "save" anything. Choose the model the role maps to, and give it the depth the task needs.
- If a user asks why the stack is not rationing spend, the answer is that spend is not the constraint on-prem. **Quality and the lock are.**

This principle changes what "good enough" means: with the budget unlocked, the standard for a spawn is the strongest on-prem model fit for the role, not the cheapest one that might work.

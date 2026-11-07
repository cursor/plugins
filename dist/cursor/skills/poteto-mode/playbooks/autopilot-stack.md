---
description: "Autopilot-stack"
---

### Autopilot-stack

Read [the shared policy](../../../docs/core.md) and the current client adapter first. Its scope gates, model routing, worker limits, and required-capability rules govern this playbook. Personal-style cleanup and external integrations are optional; historical large-fan-out recipes require explicit approval.

Run the Autopilot-full playbook, but do not merge.

1. **In place of step 5, stop at verified.** Hand off each verified current head. Do not merge. Publishing still requires separate authorization. Any supported audit tick names this no-merge rule.
2. **Stack only a real dependency.** Base a dependent change on its parent and independent changes on trunk. A changed parent can invalidate downstream verification even when a patch ID survives; rerun checks affected by the new base. Restacking and publishing require approval and must preserve uncommitted work.

**Reply:** list each PR with its verdict, in place of what merged.

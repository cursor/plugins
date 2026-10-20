# Panel

Cross-model review of a diff or a design, with judges on on-prem models. Use for "panel this", "cross-judge these attempts", or any multi-model review the mode routes here.

1. Name the artifact under review (diff, design, doc) and the question the panel answers.
2. Spawn one subagent per panel entry, each on a distinct allowlisted family from the rule file. Default: `Qwen/Qwen3.8-27B-FP8` and `zai-org/GLM-5.3`. Keep the panel to the two families per **panel-composition**; do not add a third.
3. Gather each result. A failed spawn follows the **spawn-retry** playbook.
4. Spawn a cross-judge on a family different from the parent when possible (stay on-prem either way). The cross-judge picks a winner or names the parts to merge.
5. Report the verdict, cite the panel models, and apply **deterministic-proof** where a check can settle what the panel claimed.

A managed review (such as RoboDev) may feed this panel as evidence. It never takes a seat and never cross-judges; the seats and the verdict stay on-prem. See the **robodev** playbook for that path.

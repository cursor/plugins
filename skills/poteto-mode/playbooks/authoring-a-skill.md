---
description: "Authoring or modifying a skill"
---

### Authoring or modifying a skill

Read [the shared policy](../../../docs/core.md) and the current client adapter first. Its scope gates, model routing, worker limits, and required-capability rules govern this playbook. Personal-style cleanup and external integrations are optional; historical large-fan-out recipes require explicit approval.

**You own the skill's voice.**

1. Use the host's skill-authoring flow if available. Otherwise author a directory containing `SKILL.md` with `name` and a quoted discovery `description`, using bundled examples. Confirm workspace/user placement from the active adapter. Never edit installed plugin content.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve.
3. Test cases if structural. Skip if subjective.
4. Return the validated draft. Run **Opening a PR** only with separate commit/publishing/PR authorization.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.

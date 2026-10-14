### Authoring or modifying a skill

**You own the skill's voice.**

1. Write the `SKILL.md`. Frontmatter carries `name` (lowercase and hyphens, matching the directory)
   and a `description` that states both what the skill does and the triggers that should reach it,
   since the description is the only part loaded until the skill fires. Keep the body imperative and
   short; move detail into `references/` and link it with a Markdown link so it loads on demand.
   If your host ships its own skill-authoring flow, run it and hold it to this bar.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve.
3. Test cases if structural. Skip if subjective.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.

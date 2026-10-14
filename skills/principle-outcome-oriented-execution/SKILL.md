---
name: principle-outcome-oriented-execution
description: "Apply during planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture; don't preserve smooth intermediate states with throwaway compatibility code."
disable-model-invocation: true
---

## Host binding for this installation

Before executing this skill, resolve its actual installed location and the calling project. Read the compatible installed `pstack-host/HOST.md` and run its preflight as described there with this skill directory. Project copies take precedence over global copies. If pstack-host is missing, stop and show a supplement command selecting pstack-host from the repository recorded in this skill’s `pstack-source.json`. The host binding overrides Cursor-only tools, model slugs and plugin paths below; retain the full task and workflow instructions. Never write project state into this installed directory.

# Outcome-Oriented Execution

Optimize for the intended, verifiable end state rather than preserving smooth intermediate states.

**Why:** Keeping every intermediate step fully stable often creates temporary compatibility code that becomes long-lived debt. Converge on the target architecture and prove correctness at explicit verification boundaries.

**Core rule:**
- Prioritize end-state integrity over transitional stability
- Intermediate breakage is acceptable when it is planned, scoped, and reversible

**Guardrails:**
- Use this for planned rewrites and migrations with explicit phase boundaries
- Declare where temporary breakage is acceptable
- Keep high-signal checks for actively touched areas while migrating
- Require full static and runtime verification at plan completion

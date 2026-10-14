---
name: sharpen
description: "Sharpen a task before starting: the expert approach, what the user is really after, and the right level of specification. Use for /sharpen."
disable-model-invocation: true
---

## Host binding for this installation

Before executing this skill, resolve its actual installed location and the calling project. Read the compatible installed `pstack-host/HOST.md` and run its preflight as described there with this skill directory. Project copies take precedence over global copies. If pstack-host is missing, stop and show a supplement command selecting pstack-host from the repository recorded in this skill’s `pstack-source.json`. The host binding overrides Cursor-only tools, model slugs and plugin paths below; retain the full task and workflow instructions. Never write project state into this installed directory.

Before starting, ask how a top expert would approach this task (their raw sources, their real methods, an outside check that the result is right), what the user is really after, and whether the task is over- or underspecified. Loosen constraints that don't serve the goal as readily as you add ones that do, and leave choices that are the user's to make open instead of deciding them. Fold in only what makes the work better, not bigger, but always keep one outside check that the result is right, without narrating the framing, then do the work. Don't hand back a rewritten prompt.

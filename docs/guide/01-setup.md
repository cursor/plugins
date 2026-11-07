---
title: Set up pstack
description: Install the standalone plugin, configure host-provided models, and verify a first task.
---

## Install

Follow the [root installation steps](../../README.md) for VS Code Local,
VS Code Copilot, Copilot CLI, Cursor, or Claude Code. The standalone repository
installs at its root. Do not use the old cursor/plugins marketplace commands
to install this fork.

## Pick your models

Invoke [setup-pstack](../../skills/setup-pstack/SKILL.md), namespaced as
`/pstack:setup-pstack` in Claude Code. Setup uses the entitled host inventory and
separate identity, family, reasoning, and speed controls. It writes partial
user or project JSON outside the plugin, not a Cursor rule.

[Configuration](../configuration.md) documents precedence, exact-model catalogs,
explicit fallback, native agent generation, and migration. No advertised model
version, provider key, or paid probe is required. Inheritance is visible and
unknown identity stays unknown. Strict GPT/Claude panels stop when availability,
family metadata, or enforcement is missing.

## Keep costs bounded

Default limits are two workers and two concurrent tasks. Small questions run
directly. You can choose supported lower-cost models and reasoning settings.
Larger fan-out is opt-in, never an automatic part of architecture or explanation.
Personal tone and aggressive comment cleanup are separate optional choices.

## Verification

Use existing project tests and runtime drivers. If the project lacks a driver,
setup can offer [a verification skill](../../skills/create-verification-skill/SKILL.md)
or [formal verification](../../skills/create-formal-verification-skill/SKILL.md).
These offers are optional; required proof is not.

## First task

Start with a direct question:

```text
/how does this config loader combine defaults and project overrides?
```

Expect cited source references, no edits, and no workers for a narrow trace.
For implementation:

```text
/poteto-mode add a --json flag to this command. Preserve existing text output and verify both.
```

Use supported skill invocation in your client's menu. Cursor Custom Modes are
Cursor-specific; other hosts can select the bundled agent or invoke the skill
for each task. Check [runtime acceptance](../validation.md) before assuming
installation means the host honored model settings or permissions.

Next: [Route work through poteto-mode](./02-poteto-mode.md).

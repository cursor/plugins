---
title: pstack in Cursor
description: Native Cursor adapter and legacy configuration migration.
---

## Installation

Cursor supports portable root `plugin.json` for skills. For native agents use
the generated [dist/cursor](https://github.com/erikschlegel/fde-skill-stack/tree/main/dist/cursor) package, with its
`.cursor-plugin/plugin.json`. In **Customize**, add the standalone repository
source where the installed Cursor version offers source installation.
Team marketplace import uses the actual repository URL and a single pstack entry.
Do not assume `/add-plugin pstack` resolves this unpublished fork.

## Execution

Inspect the exposed Task schema for delegation, model choices, read-only controls,
background behavior, attachments, and continuation. Map the core's reader to a
host-enforced read-only worker only when permissions actually prevent writes.
MCP access is not justification for turning a reader into a general-purpose writer.
Use normal reading, search, edit, and question tools from the live session.

Use entitled exact model IDs. Do not alter effort or speed suffixes.
`auto` and `inherit-parent` from legacy configuration mean omit the selector,
with the central inheritance warning. A live schema rejection blocks a required
selection, rather than launching a nearest-looking ID.

## Migration and optional services

Existing `~/.cursor/rules/pstack-models.mdc` remains readable as migration input.
Setup does not overwrite it. Confirm each role's exact ID in the current model
catalog, then save central JSON. Keep unrelated rules. Remove the old role rule
only after the user confirms that it no longer conflicts.

Use `.cursor/skills/` for explicitly approved local skill copies. Writable
pstack state goes outside the installed plugin. Transcript mining requires an
active-workspace path explicitly provided by the host/user, never a wildcard
over all projects.

Cursor cloud agents, Automations, Bugbot, and cursor-team-kit remain optional
external integrations. Native cloud Task fields are meaningful only on Cursor
when available and authorized; local worktree isolation is a separate capability.

Official references checked on 2026-11-07:
[plugins](https://cursor.com/docs/plugins),
[plugin reference](https://cursor.com/docs/reference/plugins).

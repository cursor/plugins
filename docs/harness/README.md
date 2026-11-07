---
title: pstack client adapters
description: Select the execution adapter for the active harness.
---

## Select one adapter

* [VS Code Local](./vscode-local.md)
* [VS Code Copilot](./vscode-copilot.md)
* [GitHub Copilot CLI](./copilot-cli.md)
* [Cursor](./cursor.md)
* [Claude Code](./claude-code.md)

Shared stages and output contracts live in [the core](../core.md).
Do not apply one client's field names to another.

| Runtime          | Skills | Agents | Models                       | Isolation                  |
|------------------|--------|--------|------------------------------|----------------------------|
| VS Code Local    | Yes    | Yes    | Live tool/agent model        | Explicit local worktrees   |
| VS Code Copilot  | Yes    | Yes    | Native task or agent model   | Live schema or worktrees   |
| Copilot CLI      | Yes    | Yes    | Native task or agent model   | Live schema or worktrees   |
| Cursor           | Yes    | Native distribution | Host-provided catalog | Cursor or local worktrees |
| Claude Code      | Yes    | Yes    | Host-supported Claude models | Agent isolation or worktrees |
| GitHub cloud agent | No   | No     | Future target                | Not supported              |

This is the packaging/design support matrix. Runtime verification is reported
separately in [validation](../validation.md). Installation alone does not prove
tools, restrictions, model choices, or execution.

---
title: pstack in VS Code Copilot
description: Shared Copilot harness behavior and editor conversion limits.
---

## Install and discover

Enable `chat.plugins.enabled`, select **Copilot**, and run **Chat: Install Plugin
from Source** with the repository URL or absolute checkout path. CLI-installed
plugins may also be discovered by VS Code. Start a fresh session and inspect
Plugins, Agents, and the slash-command menu.

Use [the Copilot CLI adapter](./copilot-cli.md) for native `task`, model inventory,
tool groups, state, worktrees, and output contracts. Do not use Local's
`agent/runSubagent` or handoffs. Client tools such as browser or notebook tools
must use their actual qualified names from the running inventory.

## Conversion limits

VS Code plugin-agent conversion does not forward every Copilot field, including
`model-policy` and `strict-tools-list`. Do not claim those fields enforce a
required model or eliminate runtime-added tools in this harness.

The bundled reader uses only `read`/`search`; inspect its effective tools. If
write-capable tools are added, do the investigation directly instead of claiming
a restricted worker. For required model-specific panels use native user agents
only when that host honors required selection, or a verified live task selector.
If unavailable, stop the strict panel with this limitation. An explicitly approved
independent-unverified review must disclose actual/unknown families.

No editor APIs, settings-sync assumptions, external control integration, or
cloud VM is required for the core workflows.

Official references checked on 2026-11-07:
[plugin authoring](https://code.visualstudio.com/docs/agents/reference/agent-plugin-reference),
[agent file conversion](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference).

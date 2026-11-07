---
title: pstack in VS Code Local
description: Local harness tool, model, and configuration mapping.
---

## Installation and loading

Enable `chat.plugins.enabled`. Run **Chat: Install Plugin from Source**, choose
User or Workspace, and enter the repository URL or absolute checkout path.
Select **Local** before checking component discovery. The portable manifest
loads skills from `skills/` and agents from `com.github.copilot/agents/`.
Read [the core](../core.md) when invoking a skill; installation does not make
all workflows always active.

## Tools and models

Use the tools in the running session, not copied SDK names. Reading/search use
the `read`/`search` tool groups. Editing and terminal commands need separately
enabled tools. Delegation uses `agent/runSubagent`. Its live schema determines
arguments; official Local docs support a per-call model, then an agent's model,
then optional Auto, then the parent. Local model names differ from Copilot IDs.
Use model-picker/completion values for this harness and advertised controls.

Use the `pstack-reader` custom agent for read/search-only work. Do not pass
Cursor `readonly`, `subagent_type`, `environment`, or `run_in_background` fields.
Local calls are stateless: a follow-up is a fresh call with earlier findings.
Questions and todo tools are unavailable inside Local subagents; the parent
owns these. Use question/task tools only if exposed, otherwise pause with a
question or keep a response checklist.

Do not promise background continuation or resumable workers. Separate local
worktrees can isolate concurrent writers but cannot create cloud execution.
Use serialized work when the host cannot target an isolated checkout.

## Model enforcement limits

Central resolution is a preflight, not a runtime lock. Check actual execution
metadata. Cost-tier restrictions and organization policy can block an otherwise
listed model. If required selection cannot be enforced, stop before the spawn.
Unknown Auto identity cannot prove cross-family diversity.

User state is pstack JSON, not a `.mdc` file or VS Code settings mutation.
For manual model-specific agent definitions use **Chat: New Custom Agent** and
supported Local profile/workspace locations. Never edit installed generated agents.

Official references checked on 2026-11-07:
[plugins](https://code.visualstudio.com/docs/agent-customization/agent-plugins),
[agent files](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference),
[subagents](https://code.visualstudio.com/docs/agents/run/subagents).

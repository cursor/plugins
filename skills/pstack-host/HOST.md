# Codex and Claude Code binding

These rules adapt the upstream Cursor instructions. Keep the upstream task, phases, evidence, candidate count and completion criteria. This file overrides only Cursor-specific tools, paths, model names and registration statements. It does not authorize external messages, deployment or automation.

## Installed paths and dependencies

Resolve SKILL_ROOT from the host's actual location for the invoked skill, and PROJECT_ROOT from the calling project. Do not use the skill directory as cwd or store state there. Locate pstack-host in this order: the active host's project skill directory, the project .agents/skills directory, the active host's user skill directory, user .agents/skills, then a sibling of SKILL_ROOT. Codex also checks project .codex/skills and CODEX_HOME/skills. A visible project copy takes precedence even if incompatible; do not skip it to use a global version. If missing, print the install command from the skill's pstack-source.json repository field and include pstack-host.

Run `node <PSTACK_HOST_ROOT>/preflight.mjs --host codex --project <PROJECT_ROOT> --skill-root <SKILL_ROOT>`; use `claude-code` on Claude Code. Replace all placeholders with actual absolute paths. Read the compatible support directory printed by preflight. The source checkout is not proof of installation. Do not continue past an incompatible dependency. Installing one skill does not install its sibling dependencies.

Relative links resolve against the file containing them. Upstream paths through ~/.cursor/plugins, .cursor/agents or plugin cache are replaced with actual installed skill locations and <PSTACK_HOST_ROOT>/agents. Resolve sibling skills with the same project-over-user precedence and read their complete instructions, including manual skills referenced within a workflow. The root repository docs and assets are documentation, not an assumed installed runtime dependency.

## Native delegates

Run setup-pstack to create project definitions for `poteto-agent` and `comment-sicko`, then open a new session. The parent provides the absolute installed poteto-mode/SKILL.md path to every poteto-agent. Delegate reads the full upstream poteto-mode instructions and relevant principle skills.

- On Codex, use the session's native agent creation, message, wait and resume tools. Select the registered agent name only if the current tool schema supports that selector. Do not invent a selector or claim a named agent ran when the tool only supports a general delegate.
- On Claude Code, use the native Agent tool and its `subagent_type` selector for the project agent. Validate its presence before spawning; a configuration file alone is not proof of discovery.
- Replace Cursor Task model slugs with models confirmed available in the current host. Default to the parent model with model overrides omitted. Never pass Cursor Grok/Claude slugs directly to another host. Keep panel cardinality and use the upstream distinct roles or review stances when only one model family is available; report that difference.
- `inherit-parent` and `auto` mean no explicit model override. Apply reasoning effort only if the host confirms that model/effort pair. Model roles configured during setup live in the project instruction block; user-selected native model fields remain native fields.
- Preserve fresh-agent versus resume requirements. Await every required result and compare returned evidence with project files. If native delegation is absent, report the missing capability and do not claim parent self-questioning is equivalent.

Use the host's native task list, plan and question facilities when available, otherwise maintain the same checklist in project files or conversation. A reviewer persona is a prompt instruction; inherited Bash, MCP and other write tools prevent a claim of enforced read-only access. Report actual permissions. Local execution or a local worktree is not cloud execution. Cloud-only arena/swarm arms require an actual configured remote executor; if absent, stop that arm and report it as unavailable.

## Setup and updates

Read setup-pstack's full instructions. Its Node script registers project agents and updates only managed instructions after checking prior hashes. Installation does not register agents, edit root memory or activate benny. Upgrade skills, rerun setup, then validate the named agents in a new session. Preserve user models and permissions; conflicting user edits require a reviewed merge, not silent overwrite. No pstack Python CLI is required for this route.

## Scripts and project state

Use Bun for upstream TypeScript tools. Their bootstrap copies tool files into PROJECT_ROOT/.pstack/tools/<content-hash>/, installs the existing frozen lockfile there and restarts the cached entry with PROJECT_ROOT as cwd. Never run bun install in the installed skill. Node, Bun, Shell and app-driving tools retain their actual dependencies; installation alone does not supply them. State belongs in the calling project, including global skill installations.

## Cursor-specific integrations

`Make Bot UI` is retained as an upstream entry but is not adapted on either host: its Cursor update_state, routine webhook and sender key have no verified equivalent in this installation. Explain that before running it; do not send its credentials or invoke invented tools. Webhooks or UI controls require a separately configured, verified implementation.

Read benny/DEPLOYMENT.md for the project pack and trigger adapter. Setup of ordinary skills never activates benny. Real Slack/tracker writes and scheduling require explicit user targets and authorization. Mock event tests are not proof of a live automatic trigger.

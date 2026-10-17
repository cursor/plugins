# pstack in Codex

Read this adapter before following any bundled workflow. It translates the shared Cursor-oriented source; these mappings replace conflicting host-specific steps. Follow the active user's scope and the session's higher-priority instructions throughout. Installation or invoking a workflow does not authorize pushes, merges, deployments, messages, or new automations.

## Skill routing and tools

`<pstack>` is this installed package's root. Read sibling skills at `<pstack>/skills/<directory>/SKILL.md`; do not assume another plugin's same-named skill is this one. In prompts use `$poteto-mode`, `$architect`, etc. Skill directory names are the registered names. The package preserves upstream explicit invocation settings in `agents/openai.yaml`.

Map `Read`, `Grep`, `Glob`, and `Bash` to available file tools or shell commands (`rg` for search); use `apply_patch` for edits. Map `AskQuestion` to the session's available user-input tool, or plain text when none exists. Use a plan tool if exposed, otherwise track a short checklist in the conversation. Never invent a tool or unsupported parameter.

Poteto Mode applies when invoked for the current task. This package installs no session hooks and does not promise persistence across turns, compaction, or new sessions. Re-read this adapter if context no longer contains it.

## Delegation

Map `Task` to the available agent-spawn capability only when delegation is authorized and supported. `poteto-agent` and `comment-sicko` are portable prompt files under `<pstack>/agents/`, not registered Codex agent types. Use an available general agent with the relevant prompt's contents, this adapter's absolute path, and the absolute `poteto-mode/SKILL.md` path. Tell it to read the adapter first. Do not execute the prompts' Cursor plugin discovery fallback. The parent owns integration and final verification.

Map `generalPurpose` to an available general agent. A `readonly: true` brief prohibits edits; do not claim that a prompt enforces a filesystem sandbox. Use a genuinely read-only agent type when exposed. Writable workers need exclusive file ownership or separate worktrees. Never assume cloud isolation or that agents have separate filesystems. Omit `environment`, `cloud_base_branch`, `file_attachments`, and `run_in_background`; supply paths and the intended base in the brief and use only supported lifecycle tools. Use a supported follow-up/resume operation for an existing worker, or give a new worker the prior result and current state.

When agents are unavailable, perform independent passes sequentially and disclose the missing independent review. If independent evidence is essential to the requested result, report that limitation rather than claiming the gate passed. Do not simulate different models by assigning persona names.

## Models and setup

Inherit the parent model and reasoning settings by default. Cursor `claude-*`, `grok-*`, `gpt-*` slugs and effort suffixes are not evidence of Codex availability. Only override settings when the user asks and the active tool schema and model-list surface support the exact pair. `auto` and `inherit-parent` mean omit overrides. A same-model panel is not a multi-model panel.

`setup-pstack` is a capability check in this package: report whether agent spawning, model enumeration, browser/app control, and Bun are available. Explain that models inherit the parent. Do not follow its upstream steps to write `pstack-models.mdc`, alter global configuration, or create agent profiles. If the user explicitly wants persistent profiles, inspect the installed Codex documentation and existing configuration first; that is a separate configuration change.

## Paths, history, and integrations

Do not read or write `.cursor/`, Cursor transcript stores, or Cursor model rules. Use the installed package path for its resources and the actual repository for project files. Read supported Codex task-history APIs only within the user's requested scope; when unavailable, use Git and user-provided context and state the gap. Do not scrape private host databases or substitute Claude's transcript directory.

Use available app/browser/terminal tools for verification. `control-ui`, `control-cli`, and `deslop` from `cursor-team-kit` are not bundled: use an equivalent installed skill or directly inspect and verify the change, explaining unavailable coverage. `create-skill` maps to the installed skill-authoring guidance if available. Preserve the user's existing domain skills and commit conventions.

Cursor cloud agents, `/loop`, Bugbot, and Cursor automations have no assumed Codex equivalent. Read review comments through available repository tools. Use a supported monitoring capability only when the user requests monitoring; do not manufacture a durable goal or schedule from an ordinary task. The Benny pack is documentation only here and is not installed or activated. Unsupported essential integrations block that portion of the workflow; optional ones can be omitted with a clear limitation.

## Bundled programs

The shared scripts are copied unchanged. Inspect their prerequisites and platform assumptions before execution. Bun-based orchestration and PR watchers may depend on Cursor services; their presence does not make them Codex-native. Prefer native agent tools and repository commands. Do not launch a Cursor CLI, install dependencies, or create external jobs merely because an upstream playbook mentions them.

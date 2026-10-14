---
name: setup-pstack
description: Configure pstack project agents and per-role model choices for Codex or Claude Code; update managed agent instructions after upgrading skills while preserving user configuration.
---

## Host binding for this installation

Before executing this skill, resolve its actual installed location and the calling project. Read the compatible installed `pstack-host/HOST.md` and run its preflight as described there with this skill directory. Project copies take precedence over global copies. If pstack-host is missing, stop and show a supplement command selecting pstack-host from the repository recorded in this skill’s `pstack-source.json`. The host binding overrides Cursor-only tools, model slugs and plugin paths below; retain the full task and workflow instructions. Never write project state into this installed directory.

# Setup pstack

Setup configures the calling project, even when skills were installed globally. It does not enable Benny automations. Use the installed `pstack-host` support skill from the same source revision; do not use a source checkout as proof that support files are installed.

## 1. Read the current setup and available models

Read [the original role and budget specification](references/upstream-setup.md) in full. Preserve its role labels, budget intent and panel entry counts. Its Cursor rule path, Task model slugs and overwrite instruction are source behavior; use the host configuration and update rules below instead.

Inspect current project agents, project memory and `.pstack/setup/<host>.json`. Enumerate the actual models and effort controls the current host exposes. Do not guess model names or translate a Cursor slug by string replacement. With no confirmed choice, inherit the parent model. `inherit-parent` and `auto` mean omit a model override; they are not model identifiers to write into native configuration.

Retain existing choices. If the user wants to change them, offer the original four budget intentions (`unlimited — max reasoning`, `large — xhigh reasoning`, `medium — high reasoning`, `small — medium reasoning`) and explain unsupported effort levels rather than claiming they exist. Present all original roles and preserve panel sizes. A panel can use the same available model with different review angles; report that this does not provide a cross-provider comparison.

## 2. Register or update agents

Resolve the support skill's actual installed location and the installed `poteto-mode/SKILL.md` location. Run from the calling project, with absolute paths:

```sh
node '<installed-pstack-host>/setup/setup.mjs' --host codex --project '<calling-project>' --poteto-skill '<installed-poteto-mode>/SKILL.md'
```

For Claude Code use `--host claude-code`. The script reads the original personas, embeds their complete bodies plus host mapping in project-scoped native files, and adds a managed host instruction section to `AGENTS.md` (Codex) or `CLAUDE.md` (Claude Code). Codex definitions use `.codex/agents/*.toml`; Claude Code definitions use `.claude/agents/*.md`. Model and permission overrides are omitted by default.

The script records the actual support package `upstreamCommit`, successful file hashes and managed-section hashes in `.pstack/setup/<host>.json`. Source metadata and hashes are required for safe updates, not optional settings. Installed directories are read only. Updates keep configuration outside managed sections, including user model and permission fields. Edits inside managed sections, missing records for same-name agents, removed managed files and damaged records require review. Exit code 2 reports conflicts and proposed contents; no files are changed when any conflict exists. Show the current/proposed difference and agree a merge with the user. Never delete the record or silently force replacement to bypass a conflict.

## 3. Apply selected model choices

If the user selected changes, patch the native agent model fields and project memory outside the managed section. Retain the original per-role labels and list entries in project memory; before delegating, choose from that mapping using only host-supported model and effort arguments. Codex separates model from `model_reasoning_effort`; Claude Code uses its supported agent model field and session effort controls. Do not encode Cursor reasoning suffixes as model names. These user choices are edits performed by the setup conversation, not automatic model detection by the Node script. Do not alter host permissions without a user choice.

## 4. Read back and verify

Read all reported output files and the state record. Report their paths, recorded source commit and script statuses. Start a new project session and actually delegate a small scoped task to both named agents. Confirm full persona loading, project skill paths, results and effective permissions. A successful script run proves file generation and readback, not native registration or delegation. Explain missing capabilities accurately.

After upgrading skills, rerun setup and verify agents in a new session. Updating skills alone does not update copied project agent definitions. Offer the original optional project verification-skill step once when appropriate.

Benny setup is separate. Follow the installed support skill's Benny instructions to prepare project files; do not enable real external automation without the user's specified target and authorization.

Native configuration references: [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents). Project instruction files: [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Claude Code memory](https://code.claude.com/docs/en/memory).

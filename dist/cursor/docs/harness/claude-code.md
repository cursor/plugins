---
title: pstack in Claude Code
description: Native Claude Code adapter and limitations.
---

## Package and tools

Load the repository root with `claude --plugin-dir /absolute/path/to/fde-skill-stack`,
or install the single-plugin marketplace in [the README](../../README.md).
The generated native-only distribution is [dist/claude-code](https://github.com/erikschlegel/fde-skill-stack/tree/main/dist/claude-code).
Skills use `/pstack:<name>`. Read bundled files by paths relative to the current
skill; do not search other plugins or infer transcript directory slugs.

Use `Read`, `Grep`, `Glob`, `Edit`/`Write`, and `Bash` only when present. Delegation
uses `Agent`, not Cursor the host delegation tool. Use `AskUserQuestion` if available; in headless
mode stop at consequential decisions and return the question. Use `TodoWrite`
when offered, otherwise keep a short checklist in the response.

## Delegation

Select `pstack:pstack-reader` for restricted reading/search. Its allowlist is
`Read, Grep, Glob`, without `Bash`, editing, or MCP tools. Use
`pstack:poteto-agent` for implementation. Pass a self-contained brief with the
loaded skill's absolute path. Inspect the live Agent schema for model, effort,
background, continuation, and `isolation: worktree`; older versions may not
support these controls. Never assume background is the default or silently drop
required arguments. Use explicit local worktrees if supported isolation is absent.

## Models and state

Use the host's `/model` choices and Agent schema. Native aliases such as `opus`,
`sonnet`, and `haiku` are usable only if the installed host supports them.
Do not parse a Cursor slug into an alias or effort. Resolve exact configured
identities with [the central policy](../configuration.md), and omit the model
field only for explicit inheritance. GPT and xAI are not ordinarily available
through the Claude Code host; strict GPT/Claude panels therefore block, rather
than silently replacing GPT with Claude.

New setup writes pstack JSON outside the package. Existing
`~/.claude/rules/pstack-models.md` is a migration input, not a new default. Read
it only with permission, map its role lines to central roles, and confirm exact
models in this host. Leave the legacy file unchanged until the user removes
conflicting instructions. Never write configuration into the installed plugin.

## Unsupported integrations

Cursor Automations, Cursor cloud-agent services, and their dashboards are not
Claude Agent isolation. Bugbot comments may be read as ordinary PR comments if
the project provides authenticated forge access. No optional integration starts
automatically. A required unsupported service stops with an actionable error.

Official references checked on 2026-11-07:
[plugins](https://code.claude.com/docs/en/plugins),
[subagents](https://code.claude.com/docs/en/sub-agents),
[model configuration](https://code.claude.com/docs/en/model-config).

---
title: pstack
description: Standalone portable agent plugin for verified engineering work.
---

## Go deep before going fast

pstack provides reproduce-first debugging, root-cause fixes, architecture
exploration, bounded independent review, and verification. This standalone fork
retains Lauren Tan's original skills, principles, playbooks, helper tools, and
MIT attribution from [cursor/plugins](https://github.com/cursor/plugins).
It contains no other plugins and is not a conventional VS Code extension.

## Install from the repository root

These commands use this repository's identity. Remote installation requires the
standalone changes to be published; until then, use the local checkout.

### VS Code Local and Copilot

Enable `chat.plugins.enabled`. Select the intended harness, then run
**Chat: Install Plugin from Source**. Choose User or Workspace and enter:

```text
https://github.com/erikschlegel/fde-skill-stack
```

For local development enter the absolute checkout directory instead.
Start a fresh session and verify pstack under Plugins, its agents under Agents,
and its skills in the slash menu. Select `poteto-agent` or invoke `/poteto-mode`.
See [Local](./docs/harness/vscode-local.md) and
[Copilot](./docs/harness/vscode-copilot.md) for differences.

### GitHub Copilot CLI

```bash
copilot plugin install .
copilot plugin list
```

After publication:

```bash
copilot plugin install erikschlegel/fde-skill-stack
```

Restart and inspect `/agent` and `/skills list`. The portable root manifest
discovers skills and `com.github.copilot/agents/`. Use host-provided model access,
not provider API keys. See [the CLI adapter](./docs/harness/copilot-cli.md).

### Claude Code

Development load directly from this root:

```bash
claude --plugin-dir /absolute/path/to/fde-skill-stack
```

Persistent installation after publication, inside Claude Code:

```text
/plugin marketplace add erikschlegel/fde-skill-stack
/plugin install pstack@pstack-standalone
```

The marketplace has only pstack and points at `./`. Skills are namespaced:
`/pstack:poteto-mode`, `/pstack:setup-pstack`, `/pstack:how`.
The [native-only generated distribution](https://github.com/erikschlegel/fde-skill-stack/tree/main/dist/claude-code) is also loadable
with `--plugin-dir`. See [the Claude adapter](./docs/harness/claude-code.md).

### Cursor

Portable skills install from the root where Cursor offers source installation.
For native agents use [dist/cursor](https://github.com/erikschlegel/fde-skill-stack/tree/main/dist/cursor), containing the Cursor
manifest and shared workflows. In Customize or the team marketplace source
import, use this actual repository URL. Do not assume the original marketplace's
`/add-plugin pstack` command installs this fork.
See [the Cursor adapter](./docs/harness/cursor.md).

## Configure and use

Invoke [setup-pstack](./skills/setup-pstack/SKILL.md), or use the bundled Node
helper. All defaults live in [config/defaults.json](./config/defaults.json).
User defaults are `~/.config/pstack/config.json` (or `$XDG_CONFIG_HOME/pstack/config.json`);
`PSTACK_CONFIG` selects a different user file. Repository overrides are
`.pstack/config.json`. Precedence is bundled < user < repository < explicit
invocation override; runtime/organization policy always wins.

```bash
node scripts/pstack-config.mjs show
node scripts/pstack-config.mjs setup --scope user --input choices.json
node scripts/pstack-config.mjs resolve --runtime copilot-cli --role implementation --catalog catalog.json
node scripts/pstack-config.mjs resolve --runtime copilot-cli --role review --catalog catalog.json
```

Use entitled exact IDs from the host's model picker. [Configuration](./docs/configuration.md)
documents the JSON, controls, inheritance, fallback, native model-agent setup,
and idempotence. Default preferences favor GPT for implementation, Claude Opus
for judgment, fast GPT or user-selected Claude Sonnet for exploration, and GPT
plus Claude for review. These are preferences, not superiority claims. No model
version is hardcoded; xAI is optional where the host exposes it.

Unresolved ordinary roles visibly inherit the selected host model. Strict
cross-family review stops when a seat is unavailable or family metadata is unknown.
No prompt-level claim substitutes for host-enforced model/permission selection.

Start with [poteto-mode](./skills/poteto-mode/SKILL.md).
For a small walkthrough use [how](./skills/how/SKILL.md) directly.
Use [why](./skills/why/SKILL.md), [architect](./skills/architect/SKILL.md),
[arena](./skills/arena/SKILL.md), [swarm](./skills/swarm/SKILL.md),
[interrogate](./skills/interrogate/SKILL.md), and [reflect](./skills/reflect/SKILL.md)
when their scope earns the work. The [guide](./docs/guide/README.md) indexes the
retained workflows. [The shared policy](./docs/core.md) governs every playbook.

## Compatibility and optional behavior

See the [client matrix](./docs/harness/README.md) and [validation record](./docs/validation.md).
GitHub cloud-agent execution is not supported. Local worktrees are isolation,
not cloud execution. Claude Code ordinarily cannot run a GPT/Claude panel.
VS Code Copilot conversion may not enforce authored required-model or strict-tool
fields; required workflows stop when enforcement cannot be verified.

The general-purpose profile uses professional tone, conservative comment changes,
and two workers/two concurrent tasks by default. Personal tone, aggressive comment
cleanup, larger fan-out, cursor-team-kit, Bugbot, Cursor Automations, transcript
mining, and specialized UI control require explicit opt-in. No other plugin is
bundled. Project-provided verification remains required when an integration is absent.

Existing Cursor `.mdc` and Claude model rules remain untouched migration inputs.
Confirm exact model choices, save JSON, then remove conflicting legacy rules
only after review. Never write state into installed plugin content.

## Build, validate, and distribute

```bash
npm ci
npm run generate
npm run check
```

Source is at the root. Client agents/manifests and `dist/cursor`,
`dist/claude-code` are generated, never hand-edited.
[The generator](https://github.com/erikschlegel/fde-skill-stack/blob/main/scripts/generate-pstack-harness-trees.mjs) and CI reject drift.
On macOS, use the physical temporary-directory command in the
[validation record](./docs/validation.md) for the retained symlink fixture.
All distributions include skills, agents, docs, assets, helper scripts, config,
and LICENSE. No provider clients, mandatory hooks, or automatic external writes ship.

Core configuration/generation/tests require Node 22.18+.
[Runtime prerequisites](./docs/prerequisites.md) cover Bun watch-pr tools,
TLC/Java formal verification, media tools, and POSIX-only optional helpers.
Static tests do not imply model execution. No paid model calls are made by checks.

## Attribution

Copyright (c) 2026 Lauren Tan. [MIT license](./LICENSE) preserved verbatim.
Original work by [poteto](https://x.com/poteto), distributed in
[cursor/plugins](https://github.com/cursor/plugins). Existing Git history is
retained; this extraction does not reinitialize the repository.

# Codex compatibility record

## Source

- Repository: `https://github.com/cursor/plugins`
- Plugin subtree: `pstack/`
- Upstream version: `0.14.5`
- Frozen repository commit:
  `397c8660da6d3d873a91e18c2ca2f22cac1f0ac1`
- Earlier audited commit:
  `fdf357fae76feff7e5f2e5aaff57f99f644b55f8`
- The pstack subtree is identical between those two commits.

## Package boundary

The native package has a `.codex-plugin/plugin.json` manifest and a normal
`skills/` tree. Core behavior is skills-only. Local custom agents are optional
Codex configuration and are kept under `companion/agents/` for explicit
installation; they are not declared as a plugin manifest component.

For the additive upstream change, keep the existing Cursor package unchanged
and use `pstack/codex/` as the Codex plugin root. Its manifest remains at
`pstack/codex/.codex-plugin/plugin.json`, its skills remain under
`pstack/codex/skills/`, and its trusted lifecycle hook remains under
`pstack/codex/hooks/`. Install or publish that exact directory, not `pstack/`.

## Semantic migration matrix

| Cursor surface | Native Codex surface |
| --- | --- |
| `.cursor-plugin/plugin.json` | `.codex-plugin/plugin.json` |
| Slash skill invocation | `$pstack:skill-name` |
| `disable-model-invocation: true` | `agents/openai.yaml` with implicit invocation disabled |
| `Task` and `subagent_type` | Native subagent spawn with explicit role, model, and `xhigh` |
| `run_in_background` | Concurrent native spawns plus event-driven waiting |
| Cursor cloud/local agent selector | Explicit Codex worktree/local environment and permissions |
| Cursor agent Markdown | Skill behavior plus optional Codex custom-agent TOML |
| `.cursor/rules/pstack-models.mdc` | Minimal routing policy in global `AGENTS.md` |
| Cursor transcript paths | `list_threads`/`read_thread`, active context, or an explicit supplied path |
| `/loop` and durable agent resume | Goal/plan continuation and requested heartbeat/cron monitoring |
| Cursor Automations | Codex heartbeat or project cron automation |
| Cursor automation webhook | No generic equivalent; require a supplied supported endpoint |
| `.cursor/skills` | Project `.agents/skills` |
| `~/.cursor/skills` | Personal `~/.agents/skills` |

## Model contract

Every pstack child uses `xhigh`.

- Spark: bounded micro-edits.
- Luna: high-volume search, extraction, verification, and repetitive work.
- Terra: everyday implementation, refactoring, ordinary debugging, and review.
- Sol: architecture, difficult debugging, performance, synthesis, and judging.
- Panels: one of each tier; Sol cross-judges.

The parent owns decomposition, integration, acceptance, security severity,
release readiness, and external actions. Workers never accept their own work.

## Validation contract

Before release or upstream submission:

1. Validate every `skills/*/SKILL.md` with Codex's skill validator.
2. Validate `.codex-plugin/plugin.json` and all declared paths.
3. Confirm no unsupported Cursor frontmatter remains in native skills.
4. Confirm any remaining `Cursor` reference is provenance or explicit external
   compatibility, such as recognizing Cursor Bugbot comments.
5. Run the Poteto TypeScript tests and strict typecheck.
6. Validate every companion custom-agent TOML.
7. Install from the exact marketplace source and test in a fresh Codex thread.
8. Exercise at least one direct skill, one delegation workflow, one explicit-only
   skill, and one transcript-unavailable fallback.

## Known product limits

- Codex namespaces plugin skills as `$pstack:skill-name`. Large global plugin
  inventories can exceed the model-visible skill-description budget. Explicit
  namespaced invocation still resolves the skill, but implicit selection may be
  reduced when Codex reports that it removed descriptions.
- Codex plugins do not distribute personal custom-agent TOML as a manifest
  component. The package therefore carries optional companion files and merges
  the two upstream agent procedures into the relevant skills.
- A scheduled Codex automation is not an inbound Slack event handler. Full Benny
  Slack parity needs an authenticated Slack/MCP integration or another supported
  event bridge.
- Codex scheduled automations do not provide the generic Cursor webhook assumed
  by the original `make-bot-ui` workflow.
- Local Codex surfaces can define custom agents. Other plugin consumers must use
  the skill's direct spawn-time model routing fallback.

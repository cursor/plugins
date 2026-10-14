# pstack runtime: host profiles

The fallback capability table, used when no `.pstack/host.json` has been written. Each row is the
out-of-the-box truth for that host. `/setup-pstack` may raise or lower any cell after probing.

| capability | Cursor | Claude Code | Codex CLI | Copilot | generic |
|---|---|---|---|---|---|
| `DELEGATE` | yes | yes | yes, native subagents | yes, custom agents + subagents | assume no until proven |
| `PARALLEL` | yes | yes, one message N calls | yes, `max_concurrent_threads_per_session` | yes, concurrent subagents | assume no |
| `MODEL_CHOICE` | yes, slugs | partial, aliases at the call site, full IDs in an agent file | partial, per-spawn model, one vendor | yes, `model:` per agent, cross-vendor | assume no |
| `BACKGROUND` | yes | yes | yes, backgrounded process | yes, the coding agent runs unattended | assume no |
| `ASK` | `AskQuestion` | `AskUserQuestion` | `request_user_input_async` (VS Code extension), else prose | `vscode/askQuestions` | prose |
| `TODO` | native when exposed | `TodoWrite` when exposed | plan tool when exposed | session task tool when exposed | markdown checklist |
| `MCP` | yes | yes | yes | yes | unknown |
| `TRANSCRIPTS` | yes | yes | yes | partial: VS Code chat sessions in workspaceStorage (read against real files) and Copilot CLI sessions in `~/.copilot/session-state` (events not yet verified); none on the GitHub.com coding agent | unknown |
| `TRIGGER` | native automations | cron or CI | cron or CI | the coding agent, on issue assignment, PR mention or REST API | no |
| `CHANNEL` | via MCP | via MCP | via MCP | via MCP | no |
| **default tier** | **3** | **2** | **2** | **3** | **0** |

Codex reaches Tier 2 with no setup: native subagents are enabled by default and run concurrently.
It **drops to Tier 1 or 0** only where `agents.enabled` is false, or in a headless `codex exec`
context where native subagents are unconfirmed and the fallback is one backgrounded process per
delegate. `/setup-pstack` records the resolved value in `.pstack/host.json`.

Neither Codex nor Claude Code reaches Tier 3, because Tier 3 means addressing **different model
families**. Both offer a real per-delegate choice within one vendor, which is why both are Tier 2
and why their panels still need stances for genuine diversity.

Copilot does reach Tier 3, which is not where anyone expects to find it. Its model picker spans
several vendors and a custom agent may name its own `model:`, so a panel there can be genuinely
cross-vendor. The capability is newer than the rest of this table, so `/setup-pstack` should
confirm subagents are actually available in the session before relying on it.

The generic build has no host to load it. Its always-on block, sticky mode's shim included, is
`pstack/AGENTS.md`, which no host reads on its own, so sticky mode does nothing there until you
point your agent's instructions file at `pstack/AGENTS.md` or paste the block into it.

## Where things live

| artifact | Cursor | Claude Code | Codex CLI | Copilot |
|---|---|---|---|---|
| project skill | `.cursor/skills/<n>/SKILL.md` | `.claude/skills/<n>/SKILL.md` | `.agents/skills/<n>/SKILL.md` | `.github/skills/<n>/SKILL.md` |
| user skill | `~/.cursor/skills/` | `~/.claude/skills/` | `~/.agents/skills/` | `~/.copilot/skills/` (also `~/.agents/skills/`) |
| always-on rules | `.cursor/rules/*.mdc` | `CLAUDE.md` | `AGENTS.md` | `.github/copilot-instructions.md` |
| path-scoped rules | `.mdc` with `globs:` | `CLAUDE.md` prose | `AGENTS.md` per directory | `.github/instructions/<n>.instructions.md` with `applyTo:` |
| subagent definition | `agents/<n>.md` | `.claude/agents/<n>.md` | n/a | `.github/agents/<n>.agent.md` |
| user subagent definition | n/a | n/a | n/a | `~/.copilot/agents/` |
| explicit invocation | `/name` | `/name` | `$name` | `/name` |

Codex scans, in order: `$CWD/.agents/skills`, the same directory walking up to the repository
root, `$HOME/.agents/skills`, `/etc/codex/skills`, then its built-ins. `.codex/skills/` is **not**
scanned; `~/.codex/` holds `config.toml`, not skills. This port writes `.agents/skills/`.

## Frontmatter that does not port

| key | origin | fate |
|---|---|---|
| `disable-model-invocation: true` | Cursor | **Native on Claude Code too**, so it ports directly. Codex: express with `policy.allow_implicit_invocation: false` in the skill's `agents/openai.yaml`. Copilot: keep it for the manual-invoke workflow and setup skills; for a skill written to apply on its own (a principle, `unslop`, the runtime layer) it would stop the model loading the file at all, so those get `user-invocable: false` instead, which hides the skill from the picker without blocking auto-load. The router is not an exception: it keeps `disable-model-invocation: true`, as upstream gates it, so on Copilot it runs only when invoked by name. |
| `mode: true` | Cursor sticky mode | no host has it. Emulated by the mode shim in `sticky-mode.md`. |
| `reminder:` | Cursor | folded into the mode shim. |
| `icon:`, `color:` | Cursor cosmetics | dropped. |
| `is_background: true` | Cursor agent | expressed at the call site as `detached`, not on the definition. |
| `paths: [...]` | Cursor scoped skill | **Native on Claude Code and Cursor**, and becomes `applyTo:` on Copilot. All three are real glob-scoped activation. Codex has no equivalent, so it becomes a scope line in the body. |

## Adding a host

1. Add a column to both tables above.
2. Add a class-resolution block to `roles.md`.
3. Add a binding to the Host bindings section of `delegation.md`.
4. Add an entry to `HOSTS` in `build/build.mjs`, including its `caps` cells and tier.
5. Add a row to the required-files list in `build/verify.mjs`.

Nothing in `core/skills/` or `core/playbooks/` should need to change to support a new host. If it
does, that skill has a portability bug: the host-specific detail belongs in the runtime layer.

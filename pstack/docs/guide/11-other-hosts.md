# Run pstack on other hosts

Cursor is the native home for pstack (`/add-plugin pstack`). The same skills can drive Codex, Claude Code, or a plain skill folder through **host adapters**.

## What an adapter does

An adapter is a mapping table plus a thin entry skill. It tells the agent how to interpret Cursor-specific operations (Task subagents, slash commands, AskQuestion, companion plugins) on that host. Upstream playbooks under `skills/` stay unchanged.

See [`adapters/README.md`](../../adapters/README.md) for the contract.

## Install

From the `pstack/` directory:

```bash
./scripts/install-host.sh --host=codex --dest=/absolute/path/to/codex-skills
./scripts/install-host.sh --host=claude-code --dest=/absolute/path/to/project/.claude/skills
./scripts/install-host.sh --host=generic --dest=/absolute/path/to/skill-root
```

Then start a task with the installed `poteto-mode` skill (or ask the host to follow it). The entry skill requires the host `HOST.md` before upstream poteto-mode.

## Limits

- Multi-model arena/interrogate panels need host support; otherwise report the gap and inherit one model.
- `deslop` and `control-ui` / `control-cli` from `cursor-team-kit` are Cursor companions — unavailable unless you install equivalents.
- Orchestration watchers, Benny, and shipping automation are not activated by the adapter. Inspect dependencies before those routes.
- Adapters do not authorize merges, messages, or deploys.

## Verify the install

```bash
./scripts/check-host-adapters.sh
```

That checks adapter files and dry-runs installs into a temp directory. It does not run a live Feature journey on Codex or Claude Code.

# pstack for Codex

This is the native Codex port of Lauren Tan's
[pstack](https://github.com/cursor/plugins/tree/main/pstack). It preserves
pstack's engineering principles, Poteto Mode, playbooks, review panels,
verification tools, and dormant Benny workflows while replacing Cursor-only
runtime behavior with supported Codex primitives.

The source is MIT licensed. The original copyright and license are retained in
[`LICENSE`](./LICENSE).

## What ships

- 45 native ports of the original pstack skills.
- Three discoverable Benny skills: `setup-benny`, `triage-issue-reports`, and
  `reproduce-and-fix-issues`.
- All Poteto Mode playbooks, prompts, TypeScript tools, tests, guide pages, and
  images.
- Optional local Codex custom-agent profiles under `companion/agents/`.
- A trusted, session-scoped lifecycle hook that restores Poteto Mode after
  resume or compaction until the user opts out.
- A migration record that pins the upstream source and explains semantic
  substitutions.

The core workflows need no MCP server, app, or UI. They still work when hooks
are disabled; only Poteto Mode stickiness is reduced to explicit invocation.

## Model routing

Every pstack child runs at `xhigh` reasoning effort. Cost and latency are
controlled through model tier, task boundaries, and fan-out size, never by
lowering effort.

| Tier | Model | Work |
| --- | --- | --- |
| Spark | `gpt-5.3-codex-spark` | Bounded micro-edits and tight interactive iterations |
| Luna | `gpt-5.6-luna` | High-volume search, extraction, verification, and repetitive work |
| Terra | `gpt-5.6-terra` | Everyday features, refactors, ordinary bugs, and code review |
| Sol | `gpt-5.6-sol` | Architecture, complex bugs, performance, synthesis, and judging |

Multi-model panels use Spark, Luna, Terra, and Sol. Sol is the cross-judge.
The parent remains responsible for integration, acceptance, release decisions,
and security authority. When Daybreak is the parent, no pstack child replaces
its final security judgment.

## Install locally

In the dual-target source repository, `pstack/codex/` is the Codex plugin root.
For personal development, copy that directory to `~/plugins/pstack` and add the
plugin to `~/.agents/plugins/marketplace.json` with source path
`./plugins/pstack`. Then install it with the marketplace name from that file:

```bash
codex plugin add pstack@personal
```

Start a new Codex thread after installation and review/trust the bundled hook.
Run `$pstack:setup-pstack`, review its exact global changes, and authorize them
if they are correct. Setup installs the six package-owned custom-agent profiles
and the marked global `AGENTS.md` routing block. Start one more thread so those
global files are loaded.

## Start here

Use `$pstack:poteto-mode` for a non-trivial engineering task. It selects one of
the 23 playbooks and invokes other skills only when their step applies.

Common direct entry points:

| Skill | Use |
| --- | --- |
| `$pstack:how` | Explain how a subsystem works and where behavior belongs |
| `$pstack:why` | Recover rationale from code, history, and available evidence systems |
| `$pstack:architect` | Settle types, boundaries, and ownership before implementation |
| `$pstack:arena` | Generate competing candidates, judge them, and graft the best parts |
| `$pstack:swarm` | Fan independent slices out and aggregate one evidenced result |
| `$pstack:interrogate` | Run an adversarial Spark/Luna/Terra/Sol review panel |
| `$pstack:recall` | Reconstruct recent work from accessible Codex threads and live state |
| `$pstack:reflect` | Turn lessons from the active work into proposed skill improvements |
| `$pstack:no-comments` | Review comments through the Comment Sicko procedure |
| `$pstack:show-me-your-work` | Keep a durable decision and evidence trail |
| `$pstack:setup-benny` | Configure scheduled issue triage and reproduction workflows |

The full guide starts at [`docs/guide/README.md`](./docs/guide/README.md).

## Codex compatibility choices

- Plugin skill invocation uses `$pstack:skill-name`, not Cursor slash commands.
- Cursor `Task` calls map to Codex subagent spawning, status, waiting, messages,
  and bounded follow-up tasks.
- Every concurrent writer needs disjoint ownership or an isolated worktree.
- Explicit-only Cursor skills use Codex
  `policy.allow_implicit_invocation: false`.
- Explicit `$pstack:poteto-mode` activation is recorded only in the plugin's
  writable data directory, keyed by a hash of the session ID. The hook injects
  a concise reminder on later prompts and after resume or compaction; explicit
  opt-out clears it.
- Transcript workflows use Codex thread APIs when available. They never guess a
  private filesystem transcript path or cross workspace boundaries.
- Cursor cloud-agent resume and `/loop` behavior map to Codex plans, goals,
  thread heartbeats, or cron automations only when the user requested continued
  or scheduled work.
- Benny maps to scheduled Codex project automations. Slack-triggered inbound
  execution is not claimed; that requires a separate authenticated integration.
- `make-bot-ui` targets an endpoint the user actually supplies. Codex scheduled
  automations do not expose a generic incoming webhook.

See [`CODEX-COMPATIBILITY.md`](./CODEX-COMPATIBILITY.md) for the exact upstream
pin, migration matrix, and validation contract.

## Updating

Re-port against a frozen upstream commit, compare every source file, update the
compatibility matrix, run all skill and plugin validators, run the bundled Bun
tests and typecheck, then reinstall with a Codex cachebuster. Do not update the
Cursor source files in place; the upstream-compatible repository layout keeps
the original Cursor package and the Codex package side by side.

## License

MIT

# Existing management CLI

The Python CLI, viewer, core sources, build tools and run-record implementation are retained from main (978d51e). They manage the earlier portable 0.15.15 distribution, not the root upstream-based skills. Use skills add and setup-pstack for the new Codex and Claude Code installation. Do not use pstack update as an updater for that installation. No existing published package is removed.

## Previous README

# pstack, portable

[pstack](https://github.com/cursor/plugins/tree/main/pstack) is Lauren Tan's engineering workflow
for coding agents: 23 playbooks, 24 principles, 27 workflow skills, a Slack-triage automation pack,
and a router that directs agents to verify their work. It ships as a Cursor plugin and
assumes Cursor's agent loop.

This repository makes it run on **Claude Code, Codex CLI, GitHub Copilot, and Cursor**, from one
vendor-neutral source.

Nothing here changes what pstack *decides*. It changes only how a decision gets *executed* on a
host that offers less than Cursor does.

## Install

```bash
uvx --from pstack-cli pstack init     # run once, install nothing
uv tool install pstack-cli            # or keep it on PATH
pipx install pstack-cli               # or pipx
pip install pstack-cli                # or plain pip
```

From a checkout of this repository, one command builds, verifies, tests, and installs the `pstack`
command on your PATH:

```bash
make cli                      # rerun after any change; then `pstack update` in each project
make -C /path/to/PSTACK cli   # the same, from any directory
make uninstall-cli            # remove the command
```

## Watch sessions live

```bash
pstack serve --open           # http://127.0.0.1:7777
pstack serve stop             # stop all your pstack servers, from any directory
pstack serve stop --port 7777 # stop only the server on this port
```

`pstack serve` reads local Claude Code, Codex, Copilot CLI and VS Code Copilot sessions: recorded
prompts, messages, tool calls, and agent activity. Every session has an execution canvas
connecting requests, instruction references, parent updates, and delegated work. Explore
all 23 bundled playbook maps, inspect local artifacts and original logs in Resources,
and see recording gaps in Coverage. For pstack runs it shows explicit phase starts,
parallel investigation steps, Architect A/B/C, failures, pauses, and recorded return paths. Click a
node for its attempts, transition reasons, linked evidence, and tool calls. Each new run keeps a
snapshot of its workflow graph, so later playbook changes do not rewrite its history. Older runs
show completion marks with the current phase labeled unknown. Copilot action mappings still need
validation against real active sessions. The page listens on 127.0.0.1 by default, reads session stores without
writing to them, and sends nothing off the machine.

`pstack init` detects your host, writes the build that belongs there, and never overwrites work
you did not install. Other commands: `status`, `update`, `uninstall`, `doctor`, `list`, `show`,
`hosts`. See `packaging/README.md`.

Every file it writes is recorded in `.pstack/receipt.json` with its hash, which is what lets
`update` keep the files you edited and `uninstall` remove only what pstack added.

The shell installer is still there if you would rather not use pip:

```bash
./install.sh                  # detect the host, install into the current directory
./install.sh --host codex     # force a host
./install.sh --list           # show what would happen, change nothing
```

Then open a new session and run `/setup-pstack` (`$setup-pstack` on Codex). It probes what your
host can actually do and writes `.pstack/host.json`.

**Each build ships its own `USAGE.md`** — a guide written for that host: how to invoke skills and
delegates there, what enforces the read-only contract, how to configure models, the host's own
gotchas, and the full skill and playbook catalogue. It is generated from the manifest, so the paths
and capability claims in it cannot drift from what actually shipped.

The installer never overwrites an existing `CLAUDE.md`, `AGENTS.md`, or
`.github/copilot-instructions.md`. It appends pstack's section, whose mode block is marked, after your
content and leaves your content alone.
Re-running is safe.

## Use

```
/poteto-mode this PR sends two welcome emails for one purchase. Reproduce both deliveries
first, then trace the cause, fix it, and verify one email is sent.
```

The parent agent matches a playbook, exports its steps into your task list verbatim, and delegates
by role when the host supports it. Each bundled playbook has recorded completion requirements;
the checker rejects missing required artifacts, failed verdicts, and stale verification. The agent
must run that check before claiming completion. Host task synchronization and following the full
skill instructions still depend on the agent. See [the workflow contract](docs/workflow-contracts.md).
Use `/setup-pstack` once, then `/poteto-mode` for subsequent tasks; Codex uses `$setup-pstack` and
`$poteto-mode`. The router brings in the other skills as needed.

## The portability problem

Upstream pstack spells its fan-out in one host's vocabulary:

```yaml
subagent_type: generalPurpose
model: grok-4.6-fast-xhigh
readonly: true
run_in_background: true
```

Four keys, none of which exist on every host, plus a model slug that is wrong everywhere else and
goes stale on its own host in weeks. Ten of pstack's skills are built on multi-model panels, and
those panels are the part that most hosts cannot reproduce.

Naively porting this produces skills that *read* correctly and *behave* wrongly: `/interrogate`
tells you four models agreed, when in fact one model answered the same question four times in one
context window. A degraded panel that presents itself as consensus is worse than no panel.

## The fix: a runtime layer

Every ported skill states its intent in host-neutral fields, and one runtime layer binds them to
the host:

| file | what it settles |
|---|---|
| `capabilities.md` | the five capabilities, and the four-tier degradation ladder |
| `delegation.md` | the delegate spec, the panel stances, the per-host bindings |
| `roles.md` | role to model-*class* resolution. No slugs. |
| `interaction.md` | task lists and questions |
| `sticky-mode.md` | keeping mode on across turns where no host has modes |
| `automations.md` | event- and schedule-triggered runs, and what they degrade to |
| `host-binding.md` | the resolved answers for one host, generated at build time |

A skill says `role: how-explorer`, `access: read`, `count: 3`. The runtime turns that into a real
call. Adding a host means adding a column to a table, not editing 158 files.

### The degradation ladder

| tier | needs | fan-out becomes |
|---|---|---|
| 3 | delegate + parallel + model choice | N models, at once. Upstream behavior. |
| 2 | delegate + parallel | N delegates, one model family, diversity from **stances** |
| 1 | delegate | N delegates, serial, still isolated |
| 0 | none | sequential stance passes, each written to its own file before the next starts |

Default tiers: **Cursor 3, Copilot 3, Claude Code 2, Codex 2.**

Those numbers are derived from each vendor's own documentation, not assumed. An earlier version of
this port had Codex at 1 and Copilot at 0, both wrong: Codex has native subagents enabled by
default, and Copilot has custom agents, concurrent subagents and a cross-vendor model picker.
`docs/PORTING.md` §13 records what changed and why.

A skill that ran below Tier 3 says so in its output, naming the tier and what was lost. That
honesty rule is the load-bearing part. Most of pstack's value is the rubric and the verification
gate, not the parallelism, so Tier 0 pstack is worth running. Tier 0 pstack *pretending* to be
Tier 3 is not.

### Stances

At Tier 2 and below, every delegate runs the same model and would return the same answer.
Diversity gets manufactured instead: `builder`, `minimalist`, `architect`, `adversary`, `operator`,
`maintainer`. Weaker than four models. Far stronger than one delegate.

## What each host gets

| | Cursor | Claude Code | Codex CLI | Copilot |
|---|---|---|---|---|
| skills | `skills/` | `.claude/skills/` | `.agents/skills/` | `.github/skills/` |
| always-on | `.cursor/rules/pstack.mdc` | `CLAUDE.md` | `AGENTS.md` | `.github/copilot-instructions.md` |
| path-scoped | `paths` | `paths` | prose | `applyTo` |
| delegates | native | `Agent` tool | native subagents | custom agents + subagents |
| model choice | slugs | aliases, or full IDs in an agent file | per-spawn, one vendor | per agent, cross-vendor |
| tier | 3 | 2 | 2 | 3 |

Tier 3 needs *different model families*. Claude Code and Codex each give a real per-delegate model
choice within one vendor, so both sit at Tier 2 and use stances for the rest of the diversity.
Cursor and Copilot can address several vendors, so their panels are genuinely cross-vendor.

The generic build, for any other host, puts its always-on block and sticky mode in
`pstack/AGENTS.md`, which no host loads on its own: point your agent's instructions file at
`pstack/AGENTS.md`, or paste the block into it.

`typescript-best-practices` carries `paths:` upstream and becomes a real `applyTo` instructions
file on Copilot, which is the one place the port gains a capability rather than losing one.

`make-bot-ui` depends on Cursor's webhook automations and ships only in the Cursor build. Every
other skill ships everywhere.

### Beyond the skills

The port also carries the two parts of upstream that are not slash skills:

- **`automations/benny`** — a Slack issue-triage and auto-repro pack, three skills plus templates.
  It needs a runner that starts an agent from an event or a schedule. Cursor has that natively;
  elsewhere it is a cron job or a CI workflow invoking the agent headlessly with the automation
  prompt. `runtime/automations.md` gives the per-host trigger and the fail-closed rules that apply
  when no human is watching the turn. Without a runner the skills still work, invoked by hand.
- **`docs/pstack-guide/`** — the 11-part user guide, with every cross-link rewritten to this host's
  skill layout.

## Layout

```
core/           vendor-neutral source of truth
  runtime/      the portability layer, hand-authored, 7 files
  skills/       51 skills
  playbooks/    23 playbooks
  agents/       3 delegate personas
  automations/  the benny automation pack
  docs/guide/   the 11-part user guide
  manifest.json generated: capability requirements per skill
build/          compiles core/ into dist/; see build/README.md
  gen-routes.py       compiles route-contracts.json into poteto-mode's routes.json
  gen-manifest.py     rebuilds manifest.json
  build.mjs           compiles core into dist/<host>/
  verify.mjs          proves the output, exits non-zero on failure
  check-yaml.py       strict YAML parse of every emitted frontmatter block
  tests/              build-lock and run-record tests, run by `make verify`
  port/               one-time upstream port: the four normalizers, check-upstream.py, upstream.json
dist/           generated, per host. Do not edit.
install.sh
```

Rebuild and check:

```bash
make            # manifest, build, verify
```

Build commands share a checkout-wide lock, including direct invocations of the
builder, verifier, and packager. If another command is using the generated files,
the next one prints a waiting message. Make also keeps artifact stages ordered
when invoked with `-j`, so verification cannot race a directory being rebuilt.

CI (`.github/workflows/ci.yml`) runs `make all`, `make test-cli` and `make evals-test` on every push
and pull request, then fails if the build changed any tracked file. Locally, `make` is the gate: it
regenerates `dist/` (not committed) and `verify.mjs` checks every host's build. The re-derivation test
in `docs/PORTING.md` proves the normalizers are idempotent. `make test-cli` covers installing into a
directory with pre-existing content.

`verify.mjs` checks that frontmatter parses and has no duplicate keys, that no host's build leaks
another host's vocabulary, that every relative reference resolves (including bare `` `playbooks/x.md` ``
paths, which are the commonest style here), that markdown tables keep their column count, that no
paragraph is duplicated, that no skill body is empty, that Copilot carries a usable `applyTo` and
never emits a retired surface, and that the bulk substitution rules left no mangled prose. Every
check is fault-injection tested: break one deliberately and the build fails.

**Independent review rounds audited this port, and every one found real defects.** The full list is in `docs/PORTING.md` §12. The worst were: a substitution rule that
corrupted 132 file paths into a directory name containing a space, across every host including
Cursor's own build; a `make verify` that swallowed genuine YAML failures and exited 0 while printing
a false reason; a link checker blind to the majority of in-repo references, so a deleted playbook
passed; and a documented upgrade recipe that regenerated every bug the port had already fixed.

The lesson, recorded because it shaped the fixes: **the gates tested that the old thing was gone,
never that the new thing was right.** Grepping for `cursor` and finding nothing proves the string
was replaced, not that the replacement is correct.

## Adding a host

1. A column in the two tables in `core/runtime/host-profile.md`.
2. A class-resolution block in `core/runtime/roles.md`.
3. A binding in the Host bindings section of `core/runtime/delegation.md`.
4. An entry in `HOSTS` in `build/build.mjs`, including its `caps` cells.
5. A row in the required-files list in `build/verify.mjs`.

If a change to `core/skills/` or `core/playbooks/` is needed, that skill has a portability bug: the
host-specific detail belongs in the runtime layer.

## Credit

pstack is by [Lauren Tan](https://x.com/poteto), MIT licensed, and the playbooks, principles, and
skill content here are hers. See `LICENSE.upstream` and `docs/PORTING.md`, which records every
change made to her text and why.

# pstack-cli

Install [pstack](https://github.com/cursor/plugins/tree/main/pstack) into any project, on any agent host.

```bash
uvx --from pstack-cli pstack init     # run it once, install nothing
uv tool install pstack-cli            # or keep it on your PATH
pipx install pstack-cli               # or pipx
pip install pstack-cli                # or plain pip
```

Then, in any project:

```bash
cd your-project
pstack init
```

It is a standard PEP 621 package with no runtime dependencies, so every installer above works
without special support. `uvx` is the least invasive: it fetches, runs and discards.

`init` detects your host (Claude Code, Codex CLI, GitHub Copilot, Cursor, or a portable
fallback), writes the build that belongs there, and never overwrites work you did not
install. Then open a session and run `/setup-pstack`.

## Commands

| command | what it does |
|---|---|
| `pstack init` | install into this project. `--host` to force one, `--user` for user-wide, `--dry-run` to preview |
| `pstack status` | which host, which version, which files you have edited, whether mode is on |
| `pstack update` | refresh to this package's version, **keeping files you edited** unless you pass `--force` |
| `pstack uninstall` | remove exactly what pstack installed, and put back the files it replaced. `--purge` also removes `.pstack/` (config, mode state, saved host profiles), keeping run records and any backup it could not put back; `--delete-runs` removes the run records too |
| `pstack doctor` | diagnose a broken or partial install and say how to fix it |
| `pstack serve --open` | local session workspace at `127.0.0.1:7777`: Story, Map, and Activity; open Session details for agents, files, recorded steps, and evidence |
| `pstack serve stop` | stop all your running pstack servers across projects; add `--port 7777` to stop just that port |
| `pstack list` | the catalogue: skills, playbooks, principles, delegates |
| `pstack show <name>` | print a skill, playbook or principle |
| `pstack hosts` | supported hosts, their tiers and where skills land |

## Updating the frontend

`pstack update --force` refreshes project workflow files from the package already
installed on your machine. The `serve` frontend belongs to the CLI package, so
updating a project does not upgrade the frontend.

After changing this checkout, build and install the CLI with
`make -C /path/to/PSTACK cli`, then run `pstack serve stop` and `pstack serve --open`.
Stopping works from any directory and succeeds when no servers are running.
Servers started by older CLI versions need Ctrl-C once before the new stop command can manage them.
The workspace works from any project directory and reads real local sessions.
Every session opens **Story**, a compact timeline of requests, expandable agent
work, and the latest visible responses. Expand an agent to inspect its tool calls
and recorded output, or open the source event. Story preserves expanded items
and your scroll position when live activity arrives. Search or `/` opens the
session browser; light and dark appearance are available from the top bar.

**Map** connects requests, referenced instructions, parent updates, delegated
agents, and their visible outputs. Agents
with overlapping recorded lifetimes share a row; later synthesis appears below.
Recorded phases adds explicit attempts, evidence, failures, pauses, and replay.
Playbook map explores all 23 bundled routes, including the full bug-fix decision
and return paths, without assigning execution status to unrecorded steps.

**Activity** retains the detailed conversation and tool events with agent and
event filters. **Session details** exposes agents, recorded steps, evidence,
files and references, and recording coverage. Files and references includes
project-local artifact previews and paginated original host logs. Recording
coverage identifies missing phase records,
shortened activity, and history outside the loaded window. Artifacts show the
current file on disk; encrypted host records remain encrypted.

**Session replay** shares one position across Story, Map, Activity, and agent
details, including sessions without phase records. Use play/pause, previous/next,
the position slider, and playback speed in the bottom bar. Follow keeps the
current record in view; manually panning or zooming the map turns it off.
Switching views keeps the replay position. Return to live restores incoming
activity collected while you were replaying. Playback advances by record and
skips idle gaps; it stops at the last captured record.

Replay covers the available normalized history (the newest 3,000 host events)
and timestamped workflow records. It labels a partial event window as Recent
history. Record order is preserved within each source; timestamps align the
sources, with source order breaking ties. Later tool results, agent completions,
references, and phase evidence stay hidden until their recorded point. Original
logs and artifact previews still show the current files, not historical file
versions. Missing timestamps, earlier discarded events, and unrecorded phase
changes cannot be reconstructed.

Run recording also works in directories without Git. It fingerprints file content
to detect stale evidence and excludes its own `.pstack` records. A committed
bug-fix reproduction baseline still requires Git.

## How it avoids eating your work

Every file it writes is recorded in `.pstack/receipt.json` with the hash it had when written.

- A file whose hash still matches is pstack's, so `update` may replace it and `uninstall` may remove it.
- A file whose hash differs is **yours**. `update` leaves it and tells you. `uninstall` leaves it and tells you.
- Anything of yours that would be replaced or edited is copied to `.pstack/backup-<timestamp>/` first
  (`-002`, `-003` when two land in one second). `uninstall`, and a host switch, put it back where it was.
- Your instructions file (`CLAUDE.md`, `AGENTS.md`, `copilot-instructions.md`, `.cursor/rules/pstack.mdc`) is **appended to**, never overwritten.
- `.pstack/mode.md`, `host.json` and `models.md` survive every reinstall.

## Hosts

| host | tier | skills land in |
|---|---|---|
| `claude` | 2 | `.claude/skills/` |
| `codex` | 2 | `.agents/skills/` |
| `copilot` | 3 | `.github/skills/` |
| `cursor` | 3 | `skills/` |
| `generic` | 0 | `pstack/skills/` |

Tier is how much of pstack's multi-model fan-out the host supports. A skill that runs below
Tier 3 says so in its output.

## Working on this package

```bash
uv sync              # create the environment from uv.lock
uv run pytest
uv build --wheel
```

The five host builds are packed into the wheel as a content-addressed store: each distinct file
is kept once under its hash, and every host carries an index of path to hash. The guide images
alone were duplicated five times before that, which is why the wheel is a fraction of five full copies.

MIT. pstack is by Lauren Tan.

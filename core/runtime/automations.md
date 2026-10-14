# pstack runtime: automations

Some pstack work is not typed by a human at a prompt. It fires on an event (a Slack message, a new
issue, a webhook) or on a schedule. Upstream calls these **Cursor automations** and they are the
one part of pstack that assumes a hosted background runner.

The `benny` pack under `automations/` is the worked example: one automation triages incoming issue
reports, another reproduces confirmed bugs and prepares a bounded draft fix.

## Two more capabilities

| id | capability | if absent |
|---|---|---|
| `TRIGGER` | the host can start an agent run from an event or a schedule, without a human present | run the skill manually, on demand |
| `CHANNEL` | the agent can read and post to the source channel (Slack, an issue tracker) | read the report from a pasted payload, hand the reply back to the operator to post |

An automation degrades to a **manually invoked skill**. That is a real loss of automation and no
loss of rigor: the triage logic, the routing table, and the fail-closed ticket rules are identical
whether a webhook or a person started the run. Identical rules mean a run without `CHANNEL` also
hands back its tracker writes: it cannot preflight the source thread, so the operator files the
ticket and posts the reply. `setup-benny` covers the runner and manual paths for each host.

## Per-host triggers

| host | scheduled | event-driven |
|---|---|---|
| Cursor | native automations | native automations, webhook URL |
| Claude Code | `/schedule` routines, or cron calling `claude -p` | GitHub Actions calling `claude -p`, or a webhook into a runner |
| Codex CLI | cron calling `codex exec` | GitHub Actions calling `codex exec` |
| Copilot | none in chat; a scheduled GitHub Actions workflow that opens an issue and assigns it to the coding agent | the coding agent, started by issue assignment (a GitHub Actions workflow can open and assign one per event), a PR mention, or the REST API |

On Cursor and Copilot the host's own runner starts the agent. On every other host the durable
pattern is the same: **a CI workflow or cron job that runs the agent headlessly with the automation
prompt and the event payload on stdin.** The templates in
`automations/benny/templates/` are that prompt. They are host-neutral text; only the runner
changes.

## Rules for an automation on any host

- **Fail closed.** An automation that cannot verify something does not guess. It escalates to a
  human and says why. An unattended agent has nobody to catch a confident mistake.
- **Stay in the thread.** A reply goes back to the source thread, never to a new channel or a
  broadcast. Test this with a harmless report before enabling anything.
- **Bound the blast radius.** Draft pull requests, never direct pushes to a shared branch. No
  deploys, no data deletion, no customer messages. `poteto-mode`'s Autonomy rules apply with less
  slack, not more, because no human is watching the turn.
- **Keep secrets out of the pack.** Configuration lives outside the copied directory, in the
  operator's own config, and is never committed.
- **Log the run.** An unattended run without a decision trail cannot be audited after the fact.
  Use the `show-me-your-work` skill.

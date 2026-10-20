# Onprem mode

`/onprem-mode` is the entry point. It applies the lock, indexes the twelve principles, and routes to three playbooks. Start it as a Custom Mode (option+enter / alt+enter) to keep it on across turns, or plain enter for one message.

## What it does at task start

1. Reads its own principles index. Applies a principle, names it in the reply, and says which decision it changed. A principle citation with no decision behind it is the tell that it name-dropped instead of applied.
2. Matches the task to a playbook and copies the playbook's steps into the todo list verbatim. A skipped step stays in the list with a one-line reason.
3. Routes subagents through `onprem-agent`, with the model per role from the rule file.

## The three playbooks

**Audit** — validate `~/.cursor/rules/onprem-models.mdc` against the lock. Use it after a hand edit, a fresh clone of a repo that carries the rule, or whenever "is my lock intact?" is a real question. The deliverable is either a named list of violations or a clean bill, with the allowlist named.

**Spawn retry** — the failure path. A spawn failed, timed out, or was rejected; the playbook decides the retry model. It records the failure, checks whether the attempted model was allowlisted (a no means the rule or the spawn is broken and gets flagged for audit), retries up to twice on different allowlisted models, then stops with a report. It never degrades to a banned model.

**Panel** — cross-model review. One subagent per on-prem family seat, a cross-judge on the family different from the parent, and a verdict that names what was merged or won. A panel's claims get **deterministic-proof** where a check can settle them.

## The subagent

`subagent_type: "onprem-agent"` reads the mode in full before work, including the principles index. Use it for any subagent spawned inside a playbook step. Substituting `generalPurpose` skips the read and drifts, which on a 27B-class model means visible drift, not subtle drift.

## When onprem is not the tool

- You want pstack's full engineering workflow (how/why/architect/arena/swarm/interrogate) on its model policy: that is pstack. Install both and run the work you want on-prem under `/onprem-mode`.
- You want a one-off model question, not a run: answer it directly; no mode needed.

Next: [Principles](./04-principles.md).

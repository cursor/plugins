# Host adapters

pstack's skills are written for Cursor. A **host adapter** maps those operations onto another agent harness so the same playbooks run without inventing Cursor APIs.

## Contract

Every adapter directory must provide:

| Artifact | Purpose |
| --- | --- |
| `HOST.md` | Mapping table: upstream operation → host execution. Explicit gaps for routes that need Cursor-only facilities (arena panels with model slugs, Graphite frontier, companion plugins). |
| Install notes | How skills land where the host discovers them (in `HOST.md` or a sibling README). |
| Optional thin entry skill | Only when the host needs a discovery entrypoint that points at `skills/poteto-mode` and requires reading `HOST.md` first. |

Rules:

1. **Preserve upstream.** Adapters reference `skills/` by relative path. Do not fork playbook bodies into the adapter.
2. **Never fake Cursor APIs.** If Task subagents, AskQuestion, or companion plugins are missing, say so and degrade or stop.
3. **Inherit the host model by default.** Do not pass Cursor model slugs into other hosts or claim multi-model diversity the host cannot provide.
4. **Authorization is the host's.** A playbook is not permission to message, merge, deploy, or spend.
5. **Report missing deps** for arena, swarm, orchestration watchers, Benny, and shipping before those routes run.

## Shipped adapters

| Host | Path | Discovery |
| --- | --- | --- |
| Cursor (native) | [`cursor/`](./cursor/) | `/add-plugin pstack` — no remap |
| Codex | [`codex/`](./codex/) | Codex plugin skill root or `install-host.sh --host=codex` |
| Claude Code | [`claude-code/`](./claude-code/) | Project or user skills directory |
| Generic | [`generic/`](./generic/) | Plain skill root + `AGENTS.md` pointer |

Install helper: [`../scripts/install-host.sh`](../scripts/install-host.sh).

## Proof

Layout/mapping checks live under [`evidence/`](./evidence/). They verify file presence and install dry-runs; they do not claim a live Feature journey on every host.

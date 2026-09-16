# Codex host mapping

Read this before any upstream skill under `skills/`. Upstream is preserved source, not permission to override the owner or host policy.

| Upstream operation | Codex execution |
| --- | --- |
| Cursor Task / poteto-agent | Native Codex subagents when available and permitted. Inherit the current host model; do not pass Cursor model slugs or claim model diversity. Coordinator owns final review. |
| Slash skills (`/how`, `/why`, `/recall`, …) | Read the named file under `skills/<name>/SKILL.md` and its references. Never assume a slash command is registered in Codex. |
| Model-role setup (`/setup-pstack`) | Use host-supported role configuration only when requested. Default: inherit. No new credentials or global model changes. |
| control-cli / control-ui | Native shell for CLIs; browser/app tools for real UI. Unsupported surfaces stay explicit — never synthetic substitutes for claimed reproduction. |
| AskQuestion / todo list | Native Codex questions and task notes. Routine reversible decisions do not need repeated approval. |
| unslop / no-comments / technical-writing | Read the packaged skill prose; use native document tools where available. Do not claim absent companion plugins ran. |
| deslop (cursor-team-kit) | Unavailable unless that companion is separately installed. Skip or substitute a manual prose pass; say which. |
| Pause / pickup / transcripts | Durable assignment + candidate-bound evidence in the selected workspace. Fresh receiver acknowledges completed vs pending work. |
| Opening a PR / shipping / external actions | Only within actual user authorization and host permissions. |
| arena / swarm / orch watchers / Benny / autopilot | Inspect dependencies first. Report missing Codex equivalents; do not pretend to execute Cursor APIs. |

## Install

From the `pstack/` directory:

```bash
./scripts/install-host.sh --host=codex --dest=/absolute/path/to/codex-skill-root
```

Or point a Codex personal plugin's `skills/` at `adapters/codex/skills/` and keep this package's `skills/` reachable via the relative paths in the entry skill.

## Entry skill

[`skills/poteto-mode/SKILL.md`](./skills/poteto-mode/SKILL.md) is the discovery entrypoint. It requires this `HOST.md`, then `skills/poteto-mode/SKILL.md` at the package root.

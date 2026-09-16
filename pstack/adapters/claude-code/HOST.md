# Claude Code host mapping

Read this before any upstream skill under `skills/`.

| Upstream operation | Claude Code execution |
| --- | --- |
| Cursor Task / poteto-agent | Claude Code subagents / parallel tasks when available. Inherit the session model; do not pass Cursor model slugs. Coordinator owns final review. |
| Slash skills | Read `skills/<name>/SKILL.md`. Claude Code may register skills from a skills directory; do not assume Cursor slash names. |
| Model-role setup | Skip `/setup-pstack` model writing unless the user asks for a Claude-side equivalent. Default inherit. |
| control-cli / control-ui | Bash for CLIs; Claude Code browser tools when present. Never fake a UI for claimed reproduction. |
| AskQuestion / todos | Native clarifying questions and task tracking. |
| unslop / no-comments / technical-writing | Read packaged skills. |
| deslop / cursor-team-kit | Usually unavailable — report and continue with packaged unslop/no-comments. |
| Pause / pickup | Write a short assignment + pending action in the project; resume by re-reading it. |
| PR / shipping / external actions | Only with explicit user authorization. |
| arena / swarm / orch / Benny / autopilot | Report missing multi-model or Cursor automation deps before running. |

## Install

```bash
# project-local (typical)
./scripts/install-host.sh --host=claude-code --dest=/absolute/path/to/project/.claude/skills

# or user-global skills root, if you use one
./scripts/install-host.sh --host=claude-code --dest=/absolute/path/to/claude-skills
```

The installer symlinks or copies the thin `poteto-mode` entry plus a `pstack-root` pointer file so leaf skills resolve. Prefer symlink when the destination filesystem allows.

## Entry

After install, invoke the `poteto-mode` skill (or ask Claude Code to follow the pstack poteto-mode skill). It must read this `HOST.md` first.

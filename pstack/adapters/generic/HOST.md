# Generic host mapping

For harnesses without a dedicated adapter (plain skill folders, AGENTS.md-driven agents, etc.).

| Upstream operation | Generic execution |
| --- | --- |
| Cursor Task / poteto-agent | Whatever parallel worker facility the host exposes. If none, run serially. Inherit one model. |
| Slash skills | Read `skills/<name>/SKILL.md` by path. |
| Model-role setup | Skip unless the host has an equivalent config. |
| control-cli / control-ui | Shell + whatever UI tools exist. State unsupported surfaces. |
| AskQuestion / todos | Host-native prompts and a markdown checklist if needed. |
| Companion Cursor plugins | Assume absent. |
| Pause / pickup | Assignment file in the workspace. |
| External actions | Explicit user authorization only. |
| Heavy routes (arena, swarm, orch, Benny, shipping) | Report missing capabilities; use Feature / investigation / bug-fix only until proven. |

## Install

```bash
./scripts/install-host.sh --host=generic --dest=/absolute/path/to/skill-root
```

Optionally add to the project's `AGENTS.md`:

```markdown
## pstack
When the user asks for rigorous engineering work, read
`<pstack>/adapters/generic/HOST.md` then `<pstack>/skills/poteto-mode/SKILL.md`.
```

Replace `<pstack>` with the absolute package path.

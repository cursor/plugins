# Cursor host mapping

Cursor is the native host. No remapping.

| Upstream operation | Cursor execution |
| --- | --- |
| Task / poteto-agent | Cursor Task subagents with configured models from `/setup-pstack` |
| Slash skills (`/how`, `/poteto-mode`, …) | Plugin-registered skills |
| AskQuestion / todos | Native Cursor tools |
| control-cli / control-ui | `cursor-team-kit` companion skills when installed |
| deslop | `cursor-team-kit` when installed |
| Multi-model panels (arena, interrogate) | Configured panel models |
| PR babysit / shipping | Native `gh` + playbooks |

Install: `/add-plugin pstack`, then `/setup-pstack`. See [Set up pstack](../../docs/guide/01-setup.md).

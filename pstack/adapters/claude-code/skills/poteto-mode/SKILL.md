---
name: poteto-mode
description: Use pstack engineering workflows on Claude Code when the user asks for pstack, poteto-mode, or a rigorous engineering task.
---

# pstack on Claude Code

1. Resolve the pstack package root: three levels above this file when running from `adapters/claude-code/skills/poteto-mode`, or follow `PSTACK_ROOT` / `pstack-root` next to the installed skill if the installer wrote one.
2. Read the Codex-style host mapping at `adapters/claude-code/HOST.md` (package-relative) and apply it to every upstream read.
3. Read `skills/poteto-mode/SKILL.md` from the package root. Select only the matching playbook and required leaf skills.
4. Announce the playbook. Prefer Feature until other routes are proven on this host.
5. Gaps for Cursor-only facilities are explicit; do not invent Task/AskQuestion APIs.

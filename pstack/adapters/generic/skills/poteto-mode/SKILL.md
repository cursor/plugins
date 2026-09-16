---
name: poteto-mode
description: Use pstack engineering workflows on a generic agent harness when the user asks for pstack or poteto-mode.
---

# pstack on a generic host

1. Resolve the pstack package root (three levels up from this file under `adapters/generic/skills/poteto-mode`, or via `pstack-root` / `PSTACK_ROOT` from the installer).
2. Read [HOST.md](../../HOST.md).
3. Read package-root `skills/poteto-mode/SKILL.md`. Pick one playbook; prefer Feature until other routes are proven.
4. Apply the host mapping to every upstream instruction. Do not invent Cursor APIs.

# T3 — Skill reference resolution gate (PORTABILITY gate 3)

**Status:** done · **Labels:** ready-for-agent · **Spec:** SPEC.md AC3

New durable gate `scripts/check-pstack-references.mjs`: scans all markdown under
`pstack/skills` (excluding `node_modules`) for relative links and conventional
`references/|playbooks/|scripts/` paths. Bare-word targets are prompt-template
placeholders, not paths.

Result: 100 files checked, **all references resolve**, exit 0. Commit `cb8f935`.
Evidence: [verification-evidence.md — Gate 3](../../.agent/evidence/verification-evidence.md). Raw `.log` captures are gitignored; substance is inlined there.

# T4 — Runtime tests discovered and run (PORTABILITY gate 2)

**Status:** done · **Labels:** ready-for-agent · **Spec:** SPEC.md AC4

Runtime tests exist at `pstack/skills/poteto-mode/scripts/`:
`watch-pr/{policy,github,cli}.test.ts`, `orch/orch.test.ts` (bun test).

Full suite: **52 pass / 0 fail / 206 expect() calls across 4 files.**

Evidence: [verification-evidence.md — Gate 2](../../.agent/evidence/verification-evidence.md). Raw `.log` captures are gitignored; substance is inlined there.

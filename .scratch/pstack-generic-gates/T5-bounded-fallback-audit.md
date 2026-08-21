# T5 — Bounded-fallback audit (PORTABILITY gate 5)

**Status:** done · **Labels:** ready-for-agent · **Spec:** SPEC.md AC5

Audited all 44 skills for explicit degradation of unavailable capabilities.
15 covered directly; architect + blast-radius covered via parent-model fallback
clauses; principle-*/teach/prose mentions vacuous or benign.

**One gap found and fixed:** `maintain-verification-skill` source wave prescribed
concurrent subagents with no unavailability clause → added serial self-execution
fallback preserving the return shape. Commit `badf6ac`.

Full table: `.agent/evidence/gate5-fallback-audit.md`.

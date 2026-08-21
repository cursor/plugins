# pstack-generic verification evidence

Run: autonomous session 2026-08-21 · branch `chore/skill-setup-and-pstack-gates` · node v24.19.0 / bun 1.3.14

## Gate 1 — portability contract (AC1)
```
pstack portable core: 44 skills, no host or model coupling detected
```

## Marketplace validation incl. pstack-generic manifest (AC2)
```
All plugins validated successfully.
```

## Gate 2 — runtime tests, full poteto-mode suite (AC4)
```

 52 pass
 0 fail
 206 expect() calls
Ran 52 tests across 4 files. [863.00ms]
```

## Gate 3 — skill reference resolution (AC3)
```
Checked 100 markdown files under pstack/skills.
All skill references resolve.
```

## Gate 5 — bounded-fallback audit (AC5)

See [gate5-fallback-audit.md](gate5-fallback-audit.md). Verdict (revision 2): 44/44 classified — 13 explicit-coverage hits + 31 classified-by-sweep; **two** gaps found and fixed (maintain-verification-skill `badf6ac`; create-verification-skill, post-merge review branch). Revision 1's "zero open gaps" claim was wrong and is superseded.

## Smoke — live host evidence (AC6, partial)
- This session executes installed pstack-generic skills (recall, setup-pstack, reflect, swarm, interrogate, how, why, poteto-mode, principle-*) on opencode — one non-Cursor host, live.
- Remaining hosts (Cursor GUI + second non-Cursor): parked; unblock = human launches a clean session in each and confirms skill loading.

## Post-merge remediation (follow-up to PR #8)

Branch `fix/post-merge-review-findings` off `a7320ed`. Fresh-context adversarial
review of the merged branch (subagent panel — see session log for the council
substitute disclosure) produced findings F1–F8; dispositions:

| Finding | Severity | Disposition |
|---|---|---|
| F1 gate-5 audit false completeness claim | **Major** | FIXED — audit rewritten as revision 2 with reproducible counts; create-verification-skill gap found and fixed |
| F2 missing npm alias for references gate | Minor | already fixed by `1ad5f3f` before review completed |
| F3 ticket mirrors cite gitignored `.log` evidence | Minor | FIXED — citations now point at this file's sections |
| F4 SPEC non-goals vs badf6ac conflict | Minor | FIXED — SPEC.md non-goals records the gate-5 capability-binding carve-out |
| F5 "bounded" fallback had no bound | Minor | FIXED — batching discipline added to maintain-verification-skill |
| F6 vacuous-green at zero markdown files | Minor | FIXED — floor guard (≥44 skills, >0 md files), proven by fault injection |
| F7 caret "pinning" overstated | Minor | NO ACTION — lockfile is the pin; already acknowledged upstream in code-review-findings.md #5 |
| F8 latent CRLF frontmatter false-failure | Minor | FIXED — CRLF normalized before matching, proven by fault injection |

### Hardened gate 3 — fault-injection proofs

```
== A: floor (1-skill fixture)
FLOOR: expected >=44 skills (SKILL.md each) and >0 markdown files;
       found 1 skills, 1 markdown files.
exit=1   (expected 1)

== B1: CRLF-valid file inside full 44-skill tree
All skill references resolve.
exit=0   (expected 0)

== B2: CRLF file with broken relative link appended
UNRESOLVED: pstack/skills/recall/SKILL.md -> nope-missing.md
Reference check failed with 1 unresolved reference(s).
exit=1   (expected 1)
```

### Fresh runs at remediation tip (2026-08-21T~18:00Z capture)

```
AC1  pstack portable core: 44 skills, no host or model coupling detected   exit=0
AC2  All plugins validated successfully.                                   exit=0
AC3  Checked 100 markdown files under pstack/skills.                       exit=0
     All skill references resolve.
AC4  52 pass / 0 fail / 206 expect() calls across 4 files                  exit=0
```
Raw capture: `post-merge-gates-2026-08-21.log` (gitignored; substance inlined here).

### Anomalies on record

- The feature branch moved during review (concurrent run committed `1ad5f3f`,
  `b355261` and merged PR #8 while the reviewer held the old tip). All findings
  were re-verified against merged `a7320ed` before fixing.
- Clock skew: local machine timestamps say 2026-08-21/22; GitHub recorded PR #8's
  merge as 2026-02-09. Local clock appears ~6 months fast. Timestamps in these
  docs inherit the local clock and should be read as locally-consistent only.

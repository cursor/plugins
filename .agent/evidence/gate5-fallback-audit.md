# Gate 5 audit — bounded fallback for unavailable capabilities

Scope: all 44 skills under `pstack/skills/` (SKILL.md plus references/playbooks).
Contract: `pstack/PORTABILITY.md` portable core — "degrade explicitly when a
capability is unavailable"; acceptance gate 5.

> **Revision 2 (2026-08-22, post-merge review of PR #8).** Revision 1 claimed
> "15/44 direct hits" and "44/44 audited after fix; zero open gaps." Both claims
> were wrong or unreproducible: the stated grep yields **13** direct hits on
> SKILL.md files; three skills (`bro`, `tdd`, `unslop`) were absent from the
> verdict table; one non-hitting `principle-*` skill was miscounted (19 claimed,
> 20 actual); and `create-verification-skill` was labeled COVERED despite having
> no capability-degradation clause for its core drive dependency. This revision
> replaces those claims with reproducible counts and fixes both gaps found.

## Method (reproducible)

1. Direct-hit grep over SKILL.md files only:

   ```sh
   grep -rilE 'unavailable|fallback|degrade|not available' pstack/skills/*/SKILL.md
   ```

   → **13 skills**: arena, automate-me, figure-it-out, how, interrogate,
   no-comments, principle-guard-the-context-window, recall, reflect,
   setup-pstack, show-me-your-work, swarm, why.

   (An all-markdown variant returns 34 files; per-skill classification below is
   authoritative because coverage lives in whichever file binds the capability.)

2. For the remaining **31** skills: sweep capability terms
   (`subagent|delegate|spawn|host|tracker|browser|playwright|network`) per skill
   directory, then read the cited lines to separate real bindings from prose.

## Verdicts — 44/44 classified (13 direct + 31 swept)

| Skill / group | n | Verdict | Evidence |
|---|---|---|---|
| Direct hits (listed above) | 13 | COVERED | explicit degradation language in SKILL.md |
| architect | 1 | COVERED | SKILL.md L16 "If no tracker is available, keep the same short checklist"; L36 "Otherwise run independent candidates on the parent model … Never invent a model identifier" |
| blast-radius | 1 | COVERED | SKILL.md step 6: "Use distinct confirmed models when available; otherwise inherit the parent model and do not claim cross-model evidence." |
| poteto-mode | 1 | COVERED | references/plan.md L5 tracker fallback; L26–27 role/model fallbacks ("Otherwise launch a general delegate …", "Otherwise inherit the parent model and never invent an identifier") |
| maintain-verification-skill | 1 | GAP → FIXED (`badf6ac`) | serial self-execution fallback added; bounded with batching discipline in revision 2 |
| create-verification-skill | 1 | GAP → FIXED (this branch) | revision 1 missed it entirely: no degradation existed for an undriveable app; added explicit stop-and-report clause in §1 Drive |
| teach | 1 | COMPLIANT (vacuous) | zero capability-term hits |
| technical-writing | 1 | COMPLIANT (benign) | L93 "the client and the host" is prose-style guidance, not a capability binding |
| typescript-best-practices | 1 | COMPLIANT (benign) | "model variants" = TypeScript union modeling |
| tdd | 1 | COMPLIANT (benign) | L28 lists browser automation etc. as optional regression-check examples ("Examples include"), no hard binding |
| bro | 1 | COMPLIANT (vacuous) | restatement task; zero capability-term hits (absent from revision 1's table) |
| unslop | 1 | COMPLIANT (vacuous) | prose-style edits; zero capability-term hits (absent from revision 1's table) |
| principle-* without direct hits | 20 | COMPLIANT (vacuous) | only conditional mentions remain: build-the-lever L3/L20 ("When you fan work out to subagents…" — optional), make-operations-idempotent L20 ("respawns cleanly" metaphor); guard-the-context-window is among the 13 direct hits |

Count check: 13 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 20 = 44 ✓

## Residual

After both fixes, every skill carries an explicit verdict above and the counts
reconcile to 44. Two gaps were found and fixed in total across revisions:
`maintain-verification-skill` (badf6ac, bounded here) and
`create-verification-skill` (this branch). No skill remains unclassified.
Revision 1's "15/44 · zero open gaps" statement was false as written — it was
not reproducible from the stated method, omitted three skills, miscounted the
principle group by one, and mislabeled create-verification-skill COVERED. It is
superseded by this document, not amended in place.

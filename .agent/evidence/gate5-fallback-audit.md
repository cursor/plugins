# Gate 5 audit — bounded fallback for unavailable capabilities

Scope: all 44 skills under `pstack/skills/` (SKILL.md plus references/playbooks).
Contract: `pstack/PORTABILITY.md` portable core — "degrade explicitly when a
capability is unavailable"; acceptance gate 5.

## Method

1. Grep every SKILL.md for explicit degradation language
   (`unavailable|fallback|degrade|not available`): 15/44 direct hits.
2. For the 29 without hits, classify capability references
   (`subagent|delegate|spawn|model|host`) at directory level, then read the
   actual lines to separate real dependencies from benign prose.

## Verdicts

| Skill group | Verdict |
|---|---|
| 15 skills with explicit degradation language | COVERED |
| architect | COVERED — line 36: parent-model fallback, never invent identifiers; line 16: checklist-in-response fallback when no task tracker |
| blast-radius | COVERED — line 41: inherit parent model, do not claim cross-model evidence |
| teach | COMPLIANT (vacuous) — no host-capability dependency |
| technical-writing | COMPLIANT (benign) — "client and the host" is prose style guidance |
| typescript-best-practices | COMPLIANT (benign) — "model variants" is TypeScript union modeling |
| principle-* (19 skills) | COMPLIANT (vacuous) — pure principles, no capability binding |
| poteto-mode | COVERED — 11 files with host-neutral/fallback language |
| create-verification-skill | COVERED |
| **maintain-verification-skill** | **GAP → FIXED this run** — source wave prescribed concurrent subagents with no unavailability clause; added: "If the host has no subagent mechanism, run the same reads serially yourself and keep the return shape." |

## Residual

44/44 audited after fix; zero open gaps. The remaining files without fallback
language are the vacuous/benign rows in the table above — absence of the grep
pattern there is expected, not a failure.

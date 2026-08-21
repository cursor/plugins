# Code review record — cumulative diff `main...chore/skill-setup-and-pstack-gates`

Two independent fresh-context reviewers: Standards/Correctness axis + Spec/Validator axis.
Spec validator independently re-ran AC1–AC6 commands; all reproduced green
(44-skill portability exit 0 · validate-plugins exit 0 · references exit 0 ·
bun test 52/52 · audit spot-check matched · evidence file real).

## Findings and dispositions

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| 1 | MAJOR | Four triage labels missing from tracker vs docs claims | **Resolved by verification** — `gh label list` confirms needs-triage/needs-info/ready-for-agent/ready-for-human/wontfix all exist; earlier "missing" was a truncated listing on both sides |
| 2 | MINOR | CI installed ajv unpinned via `npm install --no-save`, ignoring lockfile | **Fixed** — workflow now `bun install --frozen-lockfile` |
| 3 | MINOR | New references gate unwired (no alias, no CI, absent from CLAUDE.md gates) | **Fixed** — alias added; CI runs all three gates; path filter includes `pstack/**`; CLAUDE.md updated |
| 4 | MINOR | `decodeURIComponent` throws on malformed escapes, crashing whole run | **Fixed** — try/catch, reported as unresolved reference |
| 5 | NIT | Commit message says "pinning"; ranges are caret | **Accepted as-is** — bun.lock is the pin; not rewriting pushed-stack history for prose |
| 6 | NIT | Checker edge cases (Windows seps, reference-style links, fences, hyphen placeholders) | **Partially fixed** — hyphenated placeholders exempted; rest documented as known limits in header comment |
| 7 | NIT | `skillRootOf` bogus probe when md sits directly at skills root | **Won't fix** — second probe covers it; no such file exists (44 skill dirs) |
| 8 | NIT | `.scratch` ticket location; two doc commits could be one | **Won't fix** — `.scratch/<feature>/` is the setup-matt-pocock canonical convention; history preserved |
| D1 | Drift | Gate-5 audit's re-audit grep read like a failing gate | **Fixed** — reworded to classify expected absences |

## Unrelated-changes check

CLAUDE.md + docs/agents/* (~160 lines) sit outside the SPEC Objective text but are
covered by recorded Assumption 1 (user-mandated skill-setup scope, branch name).
Retained with this note as reviewer sign-off context.

## Parked

PORTABILITY gate 4 remainder (Cursor GUI + second non-Cursor host clean-session smoke):
requires human-launched sessions. Unblock recorded in SPEC Assumption 2 and issue #6.

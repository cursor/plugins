# SPEC: pstack-generic verification & hardening

Status: active · Owner: autonomous run 2026-08-21 · Branch: `chore/skill-setup-and-pstack-gates`

## Objective

Prove the merged pstack-generic plugin (`0e4002a`, now on `main`) satisfies its own
PORTABILITY.md acceptance contract and the repo's validation gates, fixing only what
blocks those gates, and ship the result as a reviewed PR on `praxstack/cursor-plugins`.

## Work category

Developer Tools / agent-workflow plugin packaging — portability generalization of an
existing Cursor plugin (pstack by Lauren Tan) into a host-neutral variant. Not app
feature work; not UI work.

## Non-goals

- No semantic changes to any of the 44 skills' behavior (identity is human-owned per PORTABILITY.md),
  except capability-binding degradation edits required by PORTABILITY gate 5 (allowed by the
  PORTABILITY.md Identity section). Carve-out recorded 2026-08-21 after post-merge review finding F4;
  applied to date: maintain-verification-skill (badf6ac), create-verification-skill (this branch).
- No PRs or issues to `upstream` (cursor/plugins).
- No new plugins, no marketplace restructuring.
- No fixes to pre-existing gbrain workspace health gaps outside this repo (surfaced separately).

## Assumptions (recorded, not silently made)

1. The user's original numbered list lost items 1–2; proceeding with received scope
   (merge → skill setup → categorize → spec-driven loop → review/QA → PR).
2. PORTABILITY gate 4 ("clean-session smoke tests pass in Cursor and at least two
   non-Cursor hosts") cannot be fully executed autonomously here: GUI Cursor sessions
   are out of reach. Partial evidence accepted: this very session runs installed
   pstack-generic skills (recall, setup-pstack, reflect, swarm, interrogate, how, why,
   poteto-mode, principle-*) on opencode — one non-Cursor host, live. Remainder parked
   with exact unblock.
3. "Production QA images" interpreted as captured command-output evidence artifacts;
   there is no UI surface in this change, so screenshots do not apply (design-qa N/A).

## EARS acceptance criteria

- AC1 (PORTABILITY gate 1): WHEN `node scripts/check-pstack-portability.mjs` runs,
  the system SHALL exit 0 reporting all 44 skills portable.
- AC2 (defect fix): WHEN `npm install` (or `bun install`) runs at repo root followed by
  `node scripts/validate-plugins.mjs`, the system SHALL execute without module-not-found
  and exit 0 with every plugin manifest valid.
- AC3 (PORTABILITY gate 3): WHEN the reference-resolution check runs over
  `pstack/skills/**/SKILL.md`, the system SHALL report zero unresolved internal
  references (files/paths named in skill bodies exist in-repo).
- AC4 (PORTABILITY gate 2): WHEN available pstack runtime tests are discovered and run,
  the system SHALL report their pass status honestly (zero tests found is reported as such).
- AC5 (PORTABILITY gate 5): WHEN the bounded-fallback audit greps the 44 skills for
  unavailable-capability handling, the system SHALL produce a written audit note listing
  degradation language coverage and any gaps.
- AC6 (smoke): WHEN the changed surface (plugin manifests + portability script) is
  exercised end-to-end, the system SHALL have recorded passing evidence in
  `.agent/evidence/`.
- AC7 (review): WHEN the cumulative diff vs `main` is reviewed, all Major findings SHALL
  be fixed and Minors addressed or deferred with rationale.
- AC8 (ship): WHEN all above pass, a PR SHALL exist on `praxstack/cursor-plugins`
  linking spec, tickets, and evidence.

## Rollback pointers

- Merge rollback: `main` was fast-forwarded `60c641e..0e4002a`; restore via
  `git push origin 60c641e:main --force` (fork-only) if ever needed.
- Work branch: `chore/skill-setup-and-pstack-gates` off updated main.

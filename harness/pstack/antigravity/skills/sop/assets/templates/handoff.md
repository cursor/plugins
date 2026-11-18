# Handoff <n> — <task-slug> / <phase>

<!--
Written by the writer as the last act of every dispatch, because the next
session is fresh and this file is what it inherits. Only the session that did
the work knows what it tried and why it stopped; the orchestrator checks that
this file exists and never writes or edits it. Pointers over prose: a
`path:line` costs the next session one read, a description costs it a search.
Keep it under ~60 lines — it replaces the session's history, it is not a copy.

The final handoff — no approved phase left, or the task stops blocked — ends
with `## 交付报告` from templates/delivery-report.md. It is the only part the
human reads.

`## Handed back` (optional): a request the human made that is outside this
task's scope. Do not implement it here and do not drop it: quote the human's
words verbatim from intent.md, give a one-sentence reason, and stop there. The
orchestrator routes each item (new task, or a gate). In the final handoff,
extract-delivery-report.py appends these items to the report the human reads.
-->

`STATUS: PASS | NEEDS_CHANGES | BLOCKED`

`FILES: <changed paths>`

`TESTS: <path to the raw check log> tree=<scripts/tree-stamp.sh output, taken when the checks ran on the final tree>`

`RISKS: <remaining risks or none>`

`NEXT: <next phase, fix, or human decision>`

## State

- Done and verified: <what, with evidence path>
- Done but unverified: <what, and the check that was not run>
- Not started: <what remains of the approved scope>

## Tried and rejected

| Approach | Where | Why it was dropped |
| --- | --- | --- |
| | `<path:line>` | |

## Gotchas

- `<path:line>` — <what will bite the next session: hidden coupling, flaky check, misleading name>

## Handed back

- > <human's words, verbatim from intent.md> — <one-sentence reason it is outside this task; or delete this section>

## Review items addressed

| Item (from review-<n>.md) | Change | Evidence |
| --- | --- | --- |
| B-1 | `<path:line>` | |

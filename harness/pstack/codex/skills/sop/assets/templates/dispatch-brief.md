# Dispatch brief — <task-slug> → <slot>

<!--
Written by the orchestrator, read by the dispatched session. A first round goes to a
fresh session, for which this file and its reading list are everything it
knows; later rounds of the same issue go to the same live session
(`Session: reused`), so the brief points at what is new and states that it
supersedes earlier instructions where they differ. It
carries pointers and verbatim words, never conclusions: every line is copied
from an artifact, is a routing decision the orchestrator may make (tier,
gates, scope), or is a place to look. If a line contains a technical
judgement, delete it — that is the writer's job.

A native dispatch (no hc terminal, no arm) writes `- On finish: n/a (native
dispatch)` instead: a native child has no CLI to exit, and $HC_TERMINAL_ID in
its environment is its parent's terminal.

Validate before dispatch; no BRIEF_OK, no dispatch:
  python3 <skill>/scripts/check-brief.py --intent <task-dir>/intent.md <this file>
-->

- Label: <task-slug / phase — a name, not a restatement>
- Dispatch: `slot=<slot> agent=<agent> model=<model|default> [effort=<level|default>] cwd=<path> source=<policy|auto>`
- Session: <fresh | reused | fresh reason=...>
- Tier: <tiny | reviewed change | operational>
- Deliverable: <plan + gate packet | phase + handoff | review | recheck of review-<n> | evidence artifact>
- Gates ahead of you (stop and hand back before each): <none | list; each open hold in record.md as HOLD H-n: scope>
- Baseline / diff range: <sha or sha..sha | n/a>
- Tree: <reviewer: output of scripts/tree-stamp.sh on cwd, taken now | n/a>
- Problem research (external dispatch only): `<RESEARCH_DELEGATION_OK JSON copied verbatim | n/a>`
- On finish: write your deliverable, then end your turn and stand by idle; do not exit your CLI. The arm that dispatched you settles when herdr sees your turn end. If your CLI reports no status to herdr, exit it instead: your last command is `hc send "$HC_TERMINAL_ID" /exit` (use your CLI's exit command).

## Human's words (verbatim from intent.md)

> <copied, not restated>

## Required reading, in order

<!-- One absolute path per item, first thing on the line, backticked; a
`:line` suffix is fine. intent.md always. The newest review-<n>.md for
everyone, the newest handoff-<n>.md for a writer or helper, never an older one.
A reviewer is NOT given a handoff: it reads the diff and raw evidence, not the
writer's account. Diff ranges and commands are not reading — they go on the
Baseline line above. -->

1. `<task-dir>/intent.md`
2. `<task-dir>/plan.md`
3. `<task-dir>/handoff-<n>.md` (writer/helper only)
4. `<task-dir>/review-<n>.md`
5. `<each PREFLIGHT path printed by check-dispatch.py | raw verification log>`

## Unverified leads

<!-- What the orchestrator noticed during bounded read-only investigation:
`path:line` — what was observed there. No cause, no fix. The writer
re-verifies each one it relies on. Or the literal line: Leads: none -->

- `<path:line>` — <observation>

## Out of scope

- <copied from the human's words or the approved plan>

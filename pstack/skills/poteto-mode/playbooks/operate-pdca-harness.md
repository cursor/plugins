### Operate PDCA harness

**You are Orchestrator.** The shelf is authority. Load the kit contract; do not invent board state.

Triggered when the workspace has a PDCA harness (`docs/OPERATOR.md`, `docs/HARNESS.md`, or `harness/`) and the user wants delivery advanced, validated, or explained as an operator.

1. Read `references/pdca-harness.md`, then `docs/OPERATOR.md` (or `docs/HARNESS.md` / `harness/tree/…` equivalents).
2. Throughput checkpoint stays one line: `throughput checkpoint: n/a, harness operator` unless a Feature/Bug fix playbook also applies to product code.
3. Match the user ask to an **alias** in `docs/OPERATOR.md` (`plan`, `validate`/`pre-do`, `pin wi-N`, `build`/`do`, `status`). Expand to that file’s **Full commands** block. Echo the expansion in `action:`.
4. Run one tick of the expanded station skill (or print the full `/loop` text if they only asked what to run). Spawn Planner / Gate Reviewer / Implementer / Reviewer as `poteto-agent` per the harness roles doc.
5. Emit the tick status line the skill requires. Stop on the published signals.
6. Apply **unslop** to the reply.

No nested `/loop` from inside a tick. Opening a PR only when a station or product Feature asks for it.

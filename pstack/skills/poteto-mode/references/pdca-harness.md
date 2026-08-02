# PDCA harness detection

When the workspace has a PDCA harness, poteto-mode is the **preferred Orchestrator**. The harness kit owns the protocol. This file does not duplicate it.

## Detect

Any of these means a harness is present:

- `docs/OPERATOR.md`
- `docs/HARNESS.md`
- `harness/tree/docs/OPERATOR.md` or `harness/tree/docs/HARNESS.md`
- `.cursor/skills/intake-next/SKILL.md` and `.cursor/skills/build-next/SKILL.md`

Prefer `docs/OPERATOR.md` (or the `harness/tree/…` equivalent). Fall back to `docs/HARNESS.md`.

## Load

1. Read the operator contract (OPERATOR, else HARNESS).
2. Do not invent Plan/Do board moves from chat.
3. Advance only via station skills: `/intake-next`, `/build-next`, pin `/build-next wi-N`.
4. Before HITL yes, expect `python3 scripts/gate_check.py --gate <gate_id>` (exit 1 → Planner, exit 2 → Gate Reviewer, exit 0 → human yes/no).
5. Spawn role agents with `subagent_type: "poteto-agent"` per the harness `docs/AGENT-ROLES.md`.
6. Pre-implementation stop is `AWAITING_PIN`. Never pin from intake. Never treat `/loop /poteto-mode` as a station.

## Route phrases

If the user asks to run delivery, validate upstream, run until pre-implementation, or check the plan without naming a station, point them at (or run) the Plan loop from OPERATOR.md. For pre-Do re-check, use the validation prompt in OPERATOR.md (re-`gate_check`, never pin, never `/build-next`).

If only `/poteto-mode` is attached with no station and the request is clearly delivery, load OPERATOR and either run one `/intake-next` tick or name the two loop commands. Do not freestyle a parallel backlog.

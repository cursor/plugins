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

## Aliases

If the user says a short name, expand using the **Aliases** table in `docs/OPERATOR.md`, then run the matching **Full commands** block. Echo the expansion in the tick `action:`.

| Alias | Station |
| --- | --- |
| `plan` / `intake` | Plan loop |
| `validate` / `pre-do` | Pre-Do validation loop |
| `pin wi-N` | `/build-next wi-N` |
| `build` / `do` | Do loop |
| `status` | Read-only shelf report |

Synonyms (“validate upstream”, “run until pre-implementation”, “advance plan”) use the same rows. Do not invent new Cursor slash skills for aliases.

## Route phrases

If the user asks to run delivery or names an alias without a station slash command, expand via OPERATOR.md and run (or print) that full command. Do not freestyle a parallel backlog.

If only `/poteto-mode` is attached with no station and the request is clearly delivery, load OPERATOR and either expand `plan`/`validate` or name the alias table. Do not freestyle a parallel backlog.

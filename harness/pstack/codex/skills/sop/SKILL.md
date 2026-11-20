---
name: sop
description: "Run the deterministic 5-phase SOP control plane: baseline snapshots, verbatim intent & HOLD tracking, 0-Token static/command gates, and Clean-Room cross-vendor audits (`T0`/`T1`/`T2`/`T3`). Use for /sop, 'run sop gate', 'clean-room audit', or high-rigor tracked tasks."
disable-model-invocation: true
---

For Codex, read [the Codex adapter](../../docs/harness/codex.md) before following this skill. Its host mappings also apply to linked playbooks.

# SOP Control Plane

Portable 5-phase engineering control plane (`Open -> Implement -> Deterministic Gate -> Clean-Room Cross-Vendor Audit -> Metrics`). If the target project has no `.sop/gates.json`, run [`/init-sop`](../init-sop/SKILL.md) first.

## Workspace Discovery

All scripts resolve configuration via [sop_common.py](./scripts/sop_common.py) in this order (pass `--sop-root <dir>` or set `SOP_ROOT` to override):

- **Single-repo project:** tasks live in `<repo>/.sop/tasks/<slug>/`, metrics in `<repo>/.sop/metrics/`, lockfile in `<repo>/.sop/gates-lock.json` (excluded from repo tree stamps while `.sop/gates.json` and `.sop/gates-lock.json` stay tamper-checked).
- **Multi-repo workspace:** place `.sop/workspace.json` at the workspace root naming `repos`, `tasks_dir`, `metrics_dir`, `lock_file`, and optional `control_plane_repo`.
- **Reviewer policy:** reads `$SOP_POLICY_FILE`, `<sop-root>/sop-policy.json`, `<sop-root>/.sop/policy.json`, `<cwd>/.sop/policy.json`, `~/.agents/sop-policy.json`, or falls back to `pstack` model rules (`interrogate reviewers` / default cross-vendor `cli:claude` -> `cli:codex`).

## Phase 0–2: Baseline, Intent, Holds & Dispatch Briefs

Never reset baselines after `handoff-*.md` or `review-*.md` exists. Capture baselines and verbatim user words with [sop-open.py](./scripts/sop-open.py):

```bash
python3 ./scripts/sop-open.py \
  --task-dir <slug-or-path> \
  --cwd <repo-name-or-path> \
  --slot writer \
  --intent-text "<verbatim user request>" \
  [--hold "H-1 | scope: ... | release: ... | source: <verbatim>"] \
  [--lead '`path:line` — <=30-word observation'] \
  [--native]
```

- Use `--ensure-baseline` when driving changes directly without a subagent brief.
- Every brief is mechanically validated by [check-brief.py](./scripts/check-brief.py) using [the brief template](./assets/templates/dispatch-brief.md) (`Intent` quotes verbatim, continuity rules honored, reviewers never see `handoff-*.md`).
- When delegating `writer`, point it at [the handoff template](./assets/templates/handoff.md) (and [gate-packet.md](./assets/templates/gate-packet.md), [delivery-report.md](./assets/templates/delivery-report.md), [disposition.md](./assets/templates/disposition.md)).
- For tiny-change classification, run [diff-flags.py](./scripts/diff-flags.py). For gate packets and final reports, run [extract-gate-packet.py](./scripts/extract-gate-packet.py) and [extract-delivery-report.py](./scripts/extract-delivery-report.py) (with [check-disposition.py](./scripts/check-disposition.py) and [check-quota-action.py](./scripts/check-quota-action.py)) verbatim rather than summarizing.
- For `pi` + `herdr-core` non-blocking push wakeup, use bundled [await.sh](./scripts/await.sh), [herdr-agent.py](./scripts/herdr-agent.py), and [sop-await.ts](./assets/pi/sop-await.ts).
  - When `pi` runs via `antigravity-acp`, invoke `await.sh` through Pi's bridged `pi_bash` tool (not ACP's built-in shell tool) so `sop-await.ts` observes `bash` `tool_call`/`tool_result` and arms the watcher.
  - For CLIs without OSC 7501 (such as `agy` in a fresh worktree), `herdr-agent.py` probes the screen for startup trust prompts and settles with `rc=9` (`blocked`); when running directly inside `HERDR_ENV=1` without `hc`, use `herdr agent start` / `herdr agent prompt --wait` so `agent_not_ready` / `agent_blocked` surfaces immediately.

## Phase 3: Deterministic 0-Token Gate

Before any review or merge claim, run [sop-gate.py](./scripts/sop-gate.py) (`--full` forces non-fast gates on `T1_STANDARD`):

```bash
python3 ./scripts/sop-gate.py --task-dir <slug-or-path> --repos auto
```

This verifies `.sop/gates-lock.json` (`chmod 0444`, SHA-256 of `.sop/gates.json` and `enforcer_files`, optional `protected_dirs` cache inodes), runs shell/AST/comment checks (`A-dead-import`, `A-no-slop-comments`, `A-symptom-guard`, `O-shell-cli-preflight`), classifies risk (`T0_READONLY`, `T1_STANDARD`, `T2_HIGH_RISK`, `T3_OPS_PROD`), generates `evidence/diff-<repo>.patch`, and writes signed `evidence/gate-latest.json`.

## Phase 3.5: Clean-Room Cross-Vendor Audit

Run [sop-audit.py](./scripts/sop-audit.py) after `GATE_PASS`:

```bash
# Antigravity / Cursor / Claude Code (blocks cleanly via run-external-agent.mjs --mode readonly-bash):
python3 ./scripts/sop-audit.py --task-dir <slug-or-path> --backend runner

# pi + herdr-core (hc) async terminal snapshot mode:
python3 ./scripts/sop-audit.py --task-dir <slug-or-path> --backend hc --prepare --print-arm
```

- Verifies `receipt_digest`, live `tree-stamp`, baseline SHA-256 & pre-handoff mtimes, and re-derives `changed_files`/`risk_tier`.
- Strips all `handoff-*.md` from reviewer context (`Intent` + `plan.md` + project invariants + `diff-*.patch` + readonly snapshot only).
- Enforces `E-tree-receipt` (`TREE:` must match `gate-latest.json`), normalizes `review-<n>.md`, fails over cross-vendor on exit `75`, and tracks `T1_STANDARD` graduation (`15` consecutive clean shadow audits -> fastpath).

## Phase 4: Metrics

`sop-audit.py` automatically writes `<metrics-root>/<YYYY-MM>/<slug>.json`. To record an external review manually, run [record-metrics.py](./scripts/record-metrics.py):

```bash
python3 ./scripts/record-metrics.py --task-dir <task-dir> --tier T2_HIGH_RISK
```

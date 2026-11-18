---
name: init-sop
description: "Explicitly invoked skill: activate ONLY when the user explicitly writes /init-sop (or names 'init-sop') in their message, or when another pstack skill routes to it; never auto-activate on ordinary prompts. Initialize locked deterministic SOP gate configuration (`.sop/gates.json`, `.sop/gates-lock.json`, optional `.sop/workspace.json`) for any repository or multi-repo workspace. Use for /init-sop, 'setup sop', or adding SOP gates to a project."
---

# Initialize SOP Gates

In Antigravity (agy), read [the Antigravity adapter](../../docs/harness/antigravity.md) once per session before you follow this skill. It maps the Cursor names, tools, models, and Plan/Execute phases in pstack skills to Antigravity.

Bootstrap locked, tamper-checked `.sop/gates.json` verification for a repository or multi-repo workspace so [`/sop`](../sop/SKILL.md) can enforce deterministic gates and clean-room cross-vendor audits.

## 1. Inspect the repository

From the target repo (or multi-repo root), identify without asking the user what the files already show:

- **Stack & runnable checks:** `package.json` scripts (`typecheck`, `check`, `lint`, `test`), `pyproject.toml`, `go.mod`, `Cargo.toml`, or `Makefile`. Keep `fast: true` checks quick (< 30s) and `fast: false` for full suites.
- **High-risk & ops paths:** auth/billing/migration/config files for `high_risk_globs`; deploy/release/infra scripts for `ops_globs`.
- **Enforcer files:** test/lint configs that back the gates (`enforcer_files`) — locked in `.sop/gates-lock.json` by SHA-256 so workers cannot weaken checks silently.
- **Protected incremental dirs (optional):** e.g., `ios`, `android`, `ios/Pods`, `android/.gradle` under `protected_dirs` so gate runs verify cache inodes were never reset.
- **Project invariants (optional):** non-negotiable domain rules (`project_invariants`) injected into every dispatch brief and cross-vendor audit prompt.

## 2. Generate and lock `.sop/gates.json`

Run [the initializer](../sop/scripts/sop-init.py) first with `--dry-run`, refine any detected commands/globs/invariants, then write and lock:

```bash
python3 ../sop/scripts/sop-init.py --dry-run --sop-root <repo-or-workspace-root>
python3 ../sop/scripts/sop-init.py --sop-root <repo-or-workspace-root> \
  [--repo <name>=<path> ...] \
  [--gate <id>:<fast|full>:<command> ...] \
  [--invariant "<rule>" ...] \
  [--force]
```

To hand-edit an existing `.sop/gates.json` later, `chmod 0644` temporarily, edit, and re-lock via [the registry verifier](../sop/scripts/verify-gates-registry.py):

```bash
python3 ../sop/scripts/verify-gates-registry.py --sop-root <root> --update-lock
```

## 3. Verify the setup

Confirm lock integrity and run the fast gates once before handing over:

```bash
python3 ../sop/scripts/verify-gates-registry.py --sop-root <root> --verify
python3 ../sop/scripts/verify-gates-registry.py --sop-root <root> --run all --fast
```

Run `/sop` to execute tasks under this locked control plane.

---
name: hol-guard
description: Set up, verify, and operate HOL Guard security for Cursor. Use when a user wants Guard installation, Cursor harness protection, security status, approvals, receipts, or Guard diagnostics.
---

# HOL Guard

Use HOL Guard's real CLI and current Cursor harness support. Do not substitute a generic security checklist for Guard execution.

## Workflow

1. Check whether Guard is available with `hol-guard --version`.
2. If Guard is missing and the user asked to install or set it up, use `pipx install hol-guard` when `pipx` is available. Do not silently install system dependencies.
3. Prefer `hol-guard init` for guided first-run setup. It discovers supported harnesses, shows the plan first, and gates side effects behind approvals.
4. For explicit Cursor harness setup, use `hol-guard install cursor`.
5. Verify the result with `hol-guard status` and `hol-guard doctor`.
6. When Guard pauses or blocks work, inspect `hol-guard approvals` and `hol-guard receipts` instead of bypassing the decision.

## Inspection versus enforcement

`hol-guard command test '<command>'` gives a concise classification. `hol-guard command explain '<command>'` gives the evaluation trace. Both are side-effect free: they do not execute the command, apply final policy, create an approval, or record a receipt.

Do not present those inspection commands as protection. Guard's harness setup is the protection path.

## Cursor boundary

Current HOL Guard support for Cursor respects Cursor's native tool approval and focuses Guard on artifact trust before launch. Do not claim that Guard replaces Cursor's native approvals or that every Cursor tool call is intercepted by Guard.

## Guardrails

- Do not auto-approve a Guard block or weaken Guard settings just to make a task continue.
- Do not require Guard Cloud for local protection; cloud connection is optional.
- Do not use `hol-guard init --yes` unless the user explicitly requested non-interactive automation and already approved the plan.
- Do not confuse `plugin-scanner` with runtime protection. `plugin-scanner` is the separate maintainer/CI package for linting and verifying agent ecosystem packages.
- Prefer `hol-guard status`, `hol-guard doctor`, `hol-guard approvals`, and `hol-guard receipts` for operational troubleshooting before inventing manual state changes.

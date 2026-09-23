---
name: pstack
description: Use pstack's rigorous engineering workflow for non-trivial coding tasks, investigations, bug fixes, features, and refactors in Codex.
---

# Poteto mode for Codex

Use this skill when the user invokes `$pstack` or asks for a careful engineering workflow. It is a task guide, not a permission grant. Follow the user's scope and the active Codex safety and approval rules.

## Route the task

- Read-only question or design comparison: `references/playbooks/investigation.md`.
- Existing defect to reproduce and fix: `references/playbooks/bug-fix.md`.
- New or changed behavior: `references/playbooks/feature.md`.
- Behavior-preserving structural change: `references/playbooks/refactoring.md`.
- If none fits, explain the gap and use the closest applicable process without pretending this skill includes a playbook for it.

Read the selected playbook before acting. Keep a short checklist for multi-step work and mark inapplicable steps with a brief reason.

## Engineering principles

- Investigate the current code and behavior before proposing a change.
- Fix the cause supported by evidence. Do not add guards that only hide symptoms.
- Prefer the smallest change that fully solves the task. Remove unnecessary code when that simplifies the result.
- Choose data structures that express the domain and make invalid states difficult to represent.
- Keep changes in small steps that can each be checked.
- Verify behavior on the real artifact when practical. Report what was actually checked and any remaining uncertainty.
- Use subagents only as the usage budget below allows, through Codex's available subagent controls. This skill does not require a particular agent name or model.
- Be candid about tradeoffs and evidence. Do not claim a test, runtime check, or review happened unless it did.
- Label every claim in the reply as measured, inferred, or a guess, in the same sentence. Never hand the user a check you could run yourself.

## Delegation and usage budget

- If the repository contains `.pstack/config.md`, read and follow its usage profile. Otherwise use the balanced defaults below.
- The parent implements. Do not delegate code-writing to a helper; it has to rebuild context the parent already holds.
- For a non-trivial diff (a feature, a refactor, or a fix that crosses a function boundary), spawn one read-only reviewer after verification. Give it only the stated intent, the diff, and the verification output. It reports findings and does not edit. Assess each finding on its merits before acting on it.
- For a new data shape or public API, sketch two structurally distinct designs before choosing one. Do this in the parent unless the user asks for agents.
- Use no other panels unless the user asks. The parent remains responsible for synthesis and verification.

## Codex-specific rules

- Invoke this skill in Codex as `$pstack` and include the task after it.
- Use the current Codex session's model and tools. Do not assume Cursor model routing, Cursor cloud agents, plugin commands, `/loop`, or `cursor-team-kit` skills exist.
- Use repository instructions and the user's requested verification commands. Ask before irreversible actions when the active rules require it.
- Keep replies concise and plain. State the result, important choices, and verification evidence.

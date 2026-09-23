# pstack Codex Adoption Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make pstack’s rigorous core workflow usable from Codex CLI without Cursor-specific commands or model assumptions.

**Architecture:** Keep the upstream Cursor plugin unchanged under `pstack/`. Add one Codex skill under `.agents/skills/pstack/` with four focused playbook references for investigation, bug fixing, features, and refactoring. Install that skill into the user-level Codex skills directory by symlink so it is available across repositories and remains editable in this clone.

**Tech Stack:** Markdown Agent Skills (`SKILL.md`), Codex CLI local skill discovery.

---

## Design

The Codex entry point is `$pstack`. It routes the task to one of four included playbooks and uses Codex-native capabilities. It does not assume Cursor slash commands, Cursor plugin installation, Cursor model selection, Cursor cloud agents, or `cursor-team-kit`. The adapted skill preserves a small set of pstack principles: investigate before changing, fix root causes, make the smallest useful change, verify behavior, and review delegated work.

The files are separated into a local skill bundle and untouched upstream source. A user-level symlink makes the bundle available in Codex sessions across projects. Claude Code remains out of scope for this pass.

## Implementation

1. Create `.agents/skills/pstack/SKILL.md` with Codex-compatible metadata, task routing, invocation guidance, and the selected pstack principles.
2. Add four portable references under `.agents/skills/pstack/references/playbooks/` for investigation, bug fix, feature, and refactoring.
3. Inspect the new files for required metadata, clear references, and Cursor-only commands; keep the upstream `pstack/` files untouched.
4. Link `/Users/dushanz/.agents/skills/pstack` to the adapted skill folder and explain how to invoke it with `$pstack`.

## Verification

Inspect the resulting files and symlink, and confirm the skill’s invocation path and folder layout match the current Codex skills documentation. No automated test suite is needed for this Markdown-only skill.

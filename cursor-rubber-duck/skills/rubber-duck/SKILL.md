---
name: rubber-duck
description: "Use for \"rubber duck\", \"/rubber-duck\", \"second opinion\", \"critique this plan\", \"critique these changes\", \"get a critique\", or when the consult-rubber-duck rule says to seek a constructive second opinion. Spawns a read-only critic on a contrasting model family; does not edit files."
disable-model-invocation: true
---

# Rubber Duck

Get a constructive second opinion on a plan, design, implementation, or tests from a **different model family** than the one driving this session. The critic is read-only. You decide what to do with the feedback.

Inspired by GitHub Copilot’s rubber duck agent: articulate the work, have an independent critic scrutinize it, then continue with eyes open.

## Step 1 — Package the work

Gather what the critic needs:

- **Intent**: one clear paragraph — what this work is trying to accomplish (from the user request, plan, commits, or code).
- **Artifact**: the plan, design notes, diff / changed files, or tests under review.
- **Focus** (optional): any question from the user (e.g. "What edge cases are missing?").
- **Constraints**: known non-goals, deadlines, or decisions already locked.

Prefer the smallest sufficient context. For branch work, `git diff <base>...HEAD` (default base `main`) plus contents of changed files is usually enough.

## Step 2 — Pick one contrasting critic model

Choose **one** model from a **different family** than the session model:

| Session model family | Critic model (preferred) |
|----------------------|--------------------------|
| Claude | `gpt-5.5-high` |
| GPT / Codex | `claude-opus-4-8-thinking-high` |
| Composer / other / unknown | `claude-opus-4-8-thinking-high` |

If a slug is rejected as unresolvable, pick the closest same-family alternative from the Task tool’s valid list (prefer the highest-reasoning tier). Do not block the critique on a slug mismatch.

## Step 3 — Spawn the critic

Launch a single Task subagent:

- `subagent_type`: `rubber-duck`
- `model`: the critic model from Step 2
- `readonly`: `true`

Fill `references/critic-prompt.md` with intent, artifact, optional focus, and the severity rubric from `references/severity-rubric.md`. Pass that filled prompt as the Task user message.

Do **not** spawn multiple critics. Do **not** ask the critic to edit files or run mutating commands.

## Step 4 — Act on the critique

When the critic returns:

1. Read Blocking, Non-blocking, and Suggestions.
2. Fix or revise for **Blocking** before continuing implementation or declaring done.
3. Apply **Non-blocking** items when they are cheap and clearly improve success odds.
4. Note **Suggestions** briefly; do not expand scope unless the user wants that.
5. Summarize for the user in one or two sentences (what mattered, what you changed). Expand only if asked.

If the critic reports no issues, say so briefly and continue.

## Guardrails

- Constructive critic, not a rubber-stamp and not a hostile teardown.
- Skip style, formatting, naming, comment grammar, and nit best-practices that do not affect correctness or success.
- Never auto-apply critic edits; you own all file changes.
- Skip the consult for trivial, well-understood edits (see `consult-rubber-duck` rule).

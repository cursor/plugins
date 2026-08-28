---
name: automate-me
description: Turn the user's recurring preferences and working style into a personal Codex mode skill, or update an existing mode skill from fresh evidence.
---

# Automate me

Create or revise one `<handle>-mode` skill that captures durable working conventions. This workflow mines recent Codex threads, asks the user what matters, and delegates skill authoring to **skill-creator**. It does not codify one-off behavior.

## 1. Check for an existing mode

Search the active project's established skill roots, including `.agents/skills/**/*-mode/SKILL.md`, and the global `~/.agents/skills/**/*-mode/SKILL.md`. Also check the legacy `${CODEX_HOME:-~/.codex}/skills/**/*-mode/SKILL.md` location when it exists so an older mode can be updated in place. Do not search unrelated workspaces. If a matching mode exists and the user did not already say update or replace, ask whether to update it or start fresh.

In update mode, preserve sections the user has not contradicted. Mine only evidence newer than the skill's last edit when that boundary is available.

## 2. Mine Codex history

Prefer the Codex app's `list_threads` and `read_thread` tools. Limit results to the active project, requested topic, and requested time window; default “recent” to seven days. Treat titles and summaries as routing hints, then read only the relevant turns. Never guess or scan Cursor transcript paths.

If thread tools are unavailable, use the active conversation context. Use an explicitly supplied transcript path only when the user provided it. If neither source is sufficient, say what evidence is missing and continue with direct questions.

For a large thread set, use Luna (`pstack_luna`, `gpt-5.6-luna`, `xhigh`) workers on disjoint slices. Spawn them without waiting between calls, tell them not to edit files, and drain with `wait_agent`. Each returns recurring patterns plus thread IDs and turn evidence. Require support from at least two independent threads before elevating a mined preference.

Look for response style, autonomy, delegation, verification, code/prose discipline, git/process conventions, and skill-maintenance habits.

## 3. Ask the user

Mining cannot reveal preferences that never appeared. Use Codex's structured user-input tool when available: one or two short multiple-choice questions, followed by one optional free-form question. If structured input is unavailable, ask the same concise questions in chat. Do not force the user through a long questionnaire.

## 4. Cluster the evidence

Use only sections supported by evidence or direct user choice. Common sections are response style, autonomy, understand-first routing, agents, prose/code discipline, review and verification, process, and skills. Read **poteto-mode** only as a granularity example; do not copy its preferences.

## 5. Draft with skill-creator

Use **skill-creator** to write or update the mode skill.

- Preserve the existing location when updating.
- For a new project mode, use the project's established Codex skill root, defaulting to `.agents/skills/<handle>-mode/`.
- For a personal global mode, use `~/.agents/skills/<handle>-mode/` only when the user asks for global scope.
- Keep the description specific to the user's handle, `$<handle>-mode`, and working in that style.
- Mode skills are explicit-only by default. Put `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. Enable implicit invocation only when the user explicitly wants the mode considered automatically.

Apply **unslop** to the draft. Reference sibling skills instead of copying them. Show the draft and revise from user feedback.

## 6. Validate and hand off

Run skill-creator's validator on the touched skill. Do not automatically create a worktree, commit, push, or open a PR unless the user requested that delivery workflow. Report the skill path, evidence window, important rules captured, and any weak signals deliberately omitted.

## Guardrails

- Do not overfit one conversation or a contradicted preference.
- Do not read another project’s threads without being asked.
- Keep the skill operational and sparse.
- Do not invent durable preferences to make sections symmetrical.
- A narrow repeatable workflow belongs in its own skill, not a general mode.

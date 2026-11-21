---
name: thermos
description: "Launch both thermo-nuclear review subagents in parallel, then synthesize their findings. Use for thermos, double thermo review, or combined bug/security and code-quality branch audits."
disable-model-invocation: true
---

# Thermos

Run the two thermo review passes as async background subagents in parallel, then synthesize their results.

## Workflow

1. Determine the review scope from the user request, PR, current branch, or relevant changed files.
2. Gather the diff and any file/context excerpts needed for reviewers to evaluate the change without guessing.
3. **Resolve rubric paths** before spawning. Task subagents cannot invoke slash
   skills or discover plugin skill files reliably — never tell them to "load the
   thermos skill". Resolve absolute paths to:
   - `thermo-nuclear-review/SKILL.md` (security / correctness lens)
   - `thermo-nuclear-code-quality-review/SKILL.md` (structure lens)
   Search order (first existing file wins):
   1. this plugin's `skills/<skill-name>/SKILL.md` (when you know the install path)
   2. `$HOME/.claude/skills/<skill-name>/SKILL.md`
   3. newest match under
      `$HOME/.cursor/plugins/cache/cursor-public/thermos/*/skills/<skill-name>/SKILL.md`
   Prefer passing the absolute path in each Task prompt. If a path is missing,
   Read the rubric yourself and paste it under `### Rubric (inlined)` instead.
4. Launch both subagents in the same message with `run_in_background: true`:
   - `subagent_type: "thermo-nuclear-review-subagent"` for bugs, breakages, security, devex regressions, feature-flag leaks, and other branch-audit risks.
   - `subagent_type: "thermo-nuclear-code-quality-review-subagent"` for maintainability, structure, file-size growth, spaghetti, abstractions, and codebase-health risks.
5. Pass each subagent the same scoped diff/file context **plus** that lens's
   absolute rubric path (or inlined body). Instruct them to Read the path and
   **not** search for or invoke thermos / thermo-nuclear skills. Ask for
   prioritized findings with file references and evidence.
6. After both finish, synthesize the results with findings first, deduplicated across reviewers. Weight overlapping findings more heavily, resolve disagreements with your own judgment, and keep summaries brief.

If individual background summaries are already visible to the user, do not restate them wholesale. Surface the unified verdict, the highest-signal findings, and any remaining uncertainty.

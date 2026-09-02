---
name: subagent-adapter
description: 'Read this when any pstack skill says to spawn a subagent or use the Task tool. Environment adaptation for pi: there is no Task tool and no subagent infra.'
---

# Pi adaptation for pstack

This install runs on the pi coding agent, which has no Task tool and no
subagent infrastructure. Apply these substitutions whenever a skill or
playbook says to spawn a subagent / Task / `subagent_type` / cloud agent:

- **Subagent as delegate (do work):** Do the work yourself in this session,
  following poteto-mode principles. You own the diff and the review.
- **Subagent for context isolation (parse big artifacts, mine transcripts):**
  Write intermediate findings to a file (or use grep/session_search), keep
  only the summary in the main thread. Never inline raw payloads.
- **Parallel fan-out (arena, swarm, interrogate, reflect, recall):** Run the
  slices/candidates/reviewers sequentially, one pass each. If real
  parallelism matters, spawn background `pi -p "<task>" > /tmp/out.md &`
  processes (tmux) and read the outputs.
- **Fresh-eyes reviewers (interrogate, show-me-your-work, no-comments
  Comment Sicko):** Do the review as a separate dedicated pass with the
  reviewer's own rubric and adversarial posture. State findings as if
  authored by an independent reviewer; do not soften them.
- **Models config:** `~/.cursor/rules/pstack-models.mdc` does not exist and
  no per-role model selection is available. Ignore all model-slug
  instructions and use the parent session model everywhere.
- **Cursor built-ins:** `/loop`, `/deslop`, cursor-team-kit, cloud agents
  (`environment: "cloud"`) are unavailable. Fall back to the plain
  sequential behavior described above.

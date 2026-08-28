---
name: setup-pstack
description: Install or verify pstack's Codex companion agents and global AGENTS.md routing block after showing the exact change and receiving user authorization.
---

# Setup pstack

Install the package-owned custom-agent profiles and configure the global Codex
routing block that pstack skills use. Do not create `.mdc` files and do not edit
global model defaults.

## Canonical routing

All pinned roles use `xhigh` reasoning.

- Spark: `gpt-5.3-codex-spark` for bounded micro-edits.
- Luna: `gpt-5.6-luna` for high-volume search, extraction, live verification, and repetitive work.
- Terra: `gpt-5.6-terra` for everyday features, refactors, ordinary bugs, and reviews.
- Sol: `gpt-5.6-sol` for architecture, complex bugs, performance, hill-climbing, synthesis, and judging.
- Panels: Spark, Luna, Terra, and Sol; a separate Sol pass cross-judges completed outputs.

## Workflow

1. Inspect the model choices advertised by the current Codex agent/session tooling. Do not probe availability by spawning throwaway agents. Confirm that each canonical model is advertised; if one is unavailable, stop and ask the user whether to leave that role unpinned or choose from the advertised set. Never silently substitute a model family.
2. Resolve `CODEX_HOME` from the environment, falling back to `~/.codex`. The global instructions file is `<CODEX_HOME>/AGENTS.md` and the agent directory is `<CODEX_HOME>/agents/`.
3. Resolve the package templates relative to this skill at `../../companion/agents/` and `../../companion/AGENTS.fragment.md`. Require exactly `pstack_spark.toml`, `pstack_luna.toml`, `pstack_terra.toml`, `pstack_sol.toml`, `pstack_poteto.toml`, and `pstack_comment_sicko.toml`. Verify every agent template pins `model_reasoning_effort = "xhigh"` and the expected model. Verify the fragment has one balanced marker pair. Do not install from a guessed path.
4. Read the global instructions file if present. Find the block bounded by `<!-- pstack-routing:start -->` and `<!-- pstack-routing:end -->`. If no block exists, plan to append one without replacing other instructions. If malformed or duplicated markers exist, stop and show the conflict.
5. Compare each package template with the same-named destination agent file. Classify every destination as create, update, verified no-op, or conflict. A differing package-owned `pstack_*.toml` is an update; any symlink, non-regular file, unexpected owner marker, or path outside `<CODEX_HOME>/agents/` is a conflict. Never touch another agent file.
6. Show the exact proposed routing block, the six source and destination paths, and a concise diff for every update. Ask for explicit authorization before writing. Invoking setup-pstack authorizes inspection, not an unreviewed global edit.
7. After authorization, create the agent directory if needed, copy only the six exact templates, and update only the marked instructions block. Preserve all unrelated global instructions and agent files. If authorization is denied, make no change.
8. Re-read the installed files. Verify one balanced marker pair, all four exact model slugs, `xhigh` in every installed agent, the four-member panel rule, Sol cross-judgment, and byte equality between each package template and destination. Report every path and whether it was created, updated, or already correct.

## Block source

Use `../../companion/AGENTS.fragment.md` verbatim as the package-owned block.
Do not retype or regenerate it from this skill. That file is the single source
of truth used for installation, update comparison, and byte-equality
verification.

## Optional verification-skill offer

After setup, check whether the active project already has a project-specific verification skill or harness. If neither exists, offer once to use **create-verification-skill**. Do not create it without the user's approval.

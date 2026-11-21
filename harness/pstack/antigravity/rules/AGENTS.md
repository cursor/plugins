# pstack model configuration (Antigravity)
# In T3 Code, `/setup-pstack` manages the shared `~/.config/pstack/t3-models.md` across Claude Code, Antigravity, and Codex (overriding this file).
# One line per role. Omitted roles follow upstream skill defaults (routed via ./t3-code.md in T3 Code, or `inherit` in standalone Antigravity).
# Built-in subagents (`invoke_subagent` / `run_workflow`) only accept: `inherit`, `pro`, `flash`, `flash_lite`.
# Customize any role or panel seat individually using:
#   - `inherit` / `inherit-parent` / `auto` (parent model)
#   - Canonical pstack slugs (from upstream skill defaults, routed via `delegate_task` in T3 Code)
#   - `t3:<providerInstanceId>/<model>[:<effort>[:fast]]` (explicit T3 Code target)
#   - `cli:codex[:<model>]` or `cli:claude[:<model>[:<effort>]]` (standalone CLI runner)
#   - `swarm:<agy-model-slug>` (Antigravity `swarm` tool)
#
# defaults: 3
# budget: large (xhigh)
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
swarm workers: inherit

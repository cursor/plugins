# pstack model configuration (Antigravity)
# One line per role. Delete a line or set `inherit` to run on the parent conversation model.
# Built-in subagents (`invoke_subagent` / `run_workflow`) only accept: `inherit`, `pro`, `flash`, `flash_lite`.
# Cross-vendor specs (used when you ask for cross-vendor review/arena, or configured here):
#   - `cli:codex` or `cli:codex:<model>` (OpenAI Codex CLI)
#   - `cli:claude` or `cli:claude:<model>[:<effort>]` (Claude Code CLI, e.g. `cli:claude:opus:xhigh`, `cli:claude:fable:high`)
#   - `swarm:<agy-model-slug>` (Antigravity `swarm` tool, e.g. `swarm:claude-opus-4-6-thinking`)
#
# defaults: 3
# budget: large (inherit)
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
arena runners: inherit, inherit, inherit
arena cross-judge pool: inherit
swarm workers: inherit
interrogate reviewers: inherit, inherit, inherit

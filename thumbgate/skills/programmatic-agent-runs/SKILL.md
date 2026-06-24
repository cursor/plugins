---
name: programmatic-agent-runs
description: Govern Cursor SDK local, cloud, self-hosted, and subagent coding runs before they create branches or PRs.
---

# Programmatic Agent Runs

Use this skill before launching a coding agent through the Cursor SDK, Cursor cloud agents, self-hosted workers, or subagents.

## When to use

- A task starts from code, CI, a backend service, a kanban automation, or any unattended workflow
- The run can edit files, push a branch, create a PR, publish a package, deploy, or call shell tools
- The run delegates work to subagents with different prompts, models, or scopes

## Launch checklist

1. Recall lessons with `search_lessons` for the repo, branch, files, and intended action.
2. Check active gates with `prevention_rules` before enabling writes or `autoCreatePR`.
3. Use the narrowest runtime: local for developer-in-the-loop work, cloud for isolated async work, self-hosted for private network/data requirements.
4. Give each subagent a bounded file or responsibility scope.
5. Persist run metadata: runtime, repo URL, starting ref, run id, agent id, branch, PR URL, and linked ThumbGate evidence.
6. Require verification output before merge, publish, deploy, or customer-facing claims.

## Cursor SDK guardrails

- Attach ThumbGate MCP through the run environment so the agent can retrieve lessons and gates.
- Prefer a clean starting ref and a disposable branch for cloud VM runs.
- Do not set `autoCreatePR` for destructive, billing, release, or production tasks unless the gate check is clean.
- If a cloud run finishes while the developer is offline, inspect the run transcript and PR diff before treating the result as accepted.
- Capture `thumbs_down` feedback when a run violates scope, skips proof, repeats a known mistake, or opens a noisy PR.

## Output

For each governed run, report:

- Runtime: local, cloud, or self-hosted
- Scope: files, modules, or workflow the agent may touch
- Gates checked and result
- Verification evidence
- Branch or PR URL
- Any feedback captured for future prevention

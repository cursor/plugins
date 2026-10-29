# pstack in OMP

The skills in `pstack/skills` are written for Cursor. In the generated OMP tree, read this adapter before following a skill that uses Cursor tools or paths. `<pstack>` means the directory containing `skills/`, `agents/`, and `docs/`. The adapter takes precedence over Cursor-specific mechanics, not over the skill's goal or verification bar. Follow the live OMP tool schema when it differs from an example here.

## Skills and paths

| Cursor instruction | OMP action |
| --- | --- |
| Run another pstack skill (`/name`) | Read `skill://<name>` and follow it. Tell the user to invoke `/skill:<name>` when they must start a new invocation. |
| Read `../<name>/SKILL.md` or another relative skill reference | Read `skill://<name>`; read a bundled file as `skill://<name>/<path>`. |
| Run a bundled script | Resolve its physical path with `realpath skill://<name>`; `skill://` is readable, not directly executable. |
| Open a todolist | Use `todo` if present; keep the skill's phase order. |
| `AskQuestion` | Use `ask` for decisions the user must make. Keep approvals with the parent session. |
| `Grep`, `Glob`, `Read` | Use OMP's `grep`, `glob`, and `read`, with the tool schema's path selectors. |
| Cursor transcript or cloud-agent URL | Use `history://<id>` for a subagent transcript and `agent://<id>` for its result. For prior OMP sessions use `archive` in `eval` when available; never infer a transcript path from a Cursor slug. |
| `.cursor/skills/` or `~/.cursor/skills/` | Use the project's `.omp/skills/` or the active OMP profile's configured skill directories. |
| `~/.cursor/plugins/` or `.cursor-plugin/plugin.json` | Install the generated `harness/pstack/omp/skills/` as an OMP custom skill directory; OMP does not load Cursor plugin manifests. |
| Cursor's `agent-transcripts` | Read `history://<id>` for OMP children or the OMP `archive` for prior sessions. |
| Cursor's built-in `/create-skill` | Create the project's `.omp/skills/<name>/SKILL.md` following OMP's skill rules. |

The files under `<pstack>/agents/` are **source prompts**, not OMP agent definitions. Do not install them as OMP agents. Read one as context for a task item when its named agent is absent.

## Subagents

`Task` becomes one OMP `task` call. Put shared immutable context in `context` and independent assignments in `tasks[]`. Each item has a standalone `task`, a `solutionSpace` describing how open its problem is, and optionally a unique `name` and a discovered `agent`. Omit `agent` for OMP's default `task` worker. An ordinary task item does not accept Cursor's per-call `model`, `readonly`, `subagent_type`, `environment`, `run_in_background`, `cloud_base_branch`, or `resume` fields. Pass the intended branch/SHA and read-only or write scope in the brief. Check the live schema before using optional OMP fields such as `isolated` or `effort`.

For `subagent_type: generalPurpose`, choose the role from the table below. `readonly: true` means a read-only agent or an explicit read-only brief; `readonly: false` means a writer with its own worktree. Translate `environment: "cloud"` to an isolated local worktree, and `environment: "local"` to ordinary local execution. Omit `run_in_background: true` because OMP task results deliver asynchronously. Put `file_attachments` paths in the brief, and replace `resume` with a new item containing the relevant prior result unless a live agent's state is required.

| Cursor role | OMP carrier |
| --- | --- |
| Read-only repository explorer | `scout` |
| Read-only code or design reviewer | `reviewer` |
| Read-only security reviewer | `security-reviewer` |
| External researcher | `task` with a read-only, source-scoped brief; use `scout` only for repository reconnaissance |
| Implementer, planner, designer, owner, or candidate that writes | `task` in its **own Git worktree** |
| Bounded mechanical edit | `sonic` when offered by the live inventory, otherwise `task` |
| Cross-report synthesizer | A fresh `reviewer`, after reports are frozen |
| Prior-session consult | `seance` with a real source session, when available |

A `poteto-agent` brief becomes a `task` brief that first reads `skill://poteto-mode`; a `comment-sicko` brief becomes a `reviewer` brief that reads `<pstack>/agents/comment-sicko.md`. These substitutions do not claim identical agent configuration. The parent reviews every result and owns integration. Do not name `librarian`, `poteto-agent`, or `comment-sicko` as an OMP agent unless the **live** `task` inventory offers it.

Launch independent items in one batch. Children start without the parent's conversation; include the goal, exact scope, acceptance criteria, source paths and worktree ownership. A writer never edits the parent's worktree or another writer's worktree. Read completed results at `agent://<id>`; use `history://<id>` for evidence and `write agent://<id>` only to steer a running child. Wait only when no other work remains. A child is a leaf unless the parent explicitly assigns coordination.

For `how`, use a single read-only explainer on a small question, or independent `scout` explorers followed by a fresh `reviewer` explainer for a larger one. In `arena` and `architect`, ask **writing** candidates to use separate worktrees, or let read-only candidates return text in their results instead of demanding file output. Score each candidate before synthesis; a read-only `reviewer` can judge after candidates have finished. Distinct sessions are not evidence of distinct models.

## Models and `/setup-pstack`

Cursor's `~/.cursor/rules/pstack-models.mdc` and generic `~/.agents/pstack-models.md` do not route OMP tasks. For OMP, model choice comes from the active profile's `modelRoles` and `task.agentModelOverrides`; the role names and supported agents belong to the installed OMP version. Do not pass a Cursor model slug in a normal `task` item. Without OMP overrides, run on the configured OMP defaults and report that model diversity was not established. A panel is cross-model only when its **resolved** models are known to differ.

Cursor model names such as `claude-`, `grok-`, and `gpt-` slugs do not identify OMP's provider/model selectors. A Cursor `auto` or `inherit-parent` setting means: leave OMP's existing model choice unchanged. Likewise, the Cursor `~/.cursor/rules/` file is not an OMP configuration source.

When `/skill:setup-pstack` is invoked in OMP, use this procedure **instead** of writing the Cursor rule in that skill:

1. Read the active profile path and the existing `modelRoles` and `task.agentModelOverrides` records with `omp config path` and `omp config get <key> --json`. List usable selectors with `omp models --json`; check the current task-agent inventory. If any read fails, stop without writing.
2. Ask for the reasoning budget with four options: `unlimited — max reasoning`, `large — xhigh reasoning`, `medium — high reasoning`, `small — medium reasoning`. Select only real available OMP model selectors and supported effort levels; a Cursor model slug is not an OMP selector. Keep unrelated role keys and agent overrides intact; add overrides only for agents present in the live inventory. Show the exact proposed changes, active profile, effect on other OMP workflows, and whether reviewer seats resolve to different models.
3. Ask for explicit approval **before** changing the active profile. Preserve the original values for both records. Apply the approved records with `omp config set` and read them back. If either write or readback fails, restore the original values and report whether restoration succeeded. Do not alter another profile, silently replace unrelated mappings, or claim two record writes are atomic.

Using pstack requires no model-configuration write. Panel size is the number of task items, not a comma-separated Cursor model list. A user may keep the session's default model for every item.

## Cursor-only features and side effects

Cursor Automations, Bugbot launches, Cursor cloud agents, and the built-in PR tool have no direct OMP equivalent. Use a real available forge or local worktree workflow when it satisfies the original task. If an unavailable capability is essential to the requested outcome, explain the missing prerequisite rather than inventing a substitute or claiming completion. Do not create PRs, merge, delete user data, install system software, or change OMP configuration merely because a playbook mentions those actions; preserve the user's authorization boundary.

Bundled scripts keep their own prerequisites (for example Bun), and `cursor-team-kit` skills are not included in this tree. Before following a step that uses one, check that the executable or skill exists and use the closest **verified** OMP capability for the same observable task. If no equivalent exists, report the exact skipped optional step or the blocker for a required step. Do not turn a missing validation step into a passing verdict.

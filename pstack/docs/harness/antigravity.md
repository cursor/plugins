# pstack in Google Antigravity

Read this adapter before following pstack's Cursor instructions in Antigravity. `<pstack>` is the installed folder containing `plugin.json`, `skills/`, and `docs/`. Use the session's actual tool schema; omit unsupported fields and report the limitation instead of inventing a tool or model.

## Install

From a checkout of `cursor/plugins`, run:

```sh
agy plugin install ./harness/pstack/antigravity
```

For a workspace installation in the Antigravity App, copy the **entire** generated `harness/pstack/antigravity` directory to `<workspace>/.agents/plugins/pstack`. Keep the skills, agents, guide, and adapter together so relative links survive installation. Update by replacing that installed copy with a newly generated tree. Do not install the Cursor source directory. See [Antigravity plugins](https://www.antigravity.google/docs/plugins/).

The native manifest contains the source plugin's name and description. It deliberately omits Cursor and Claude manifests. Generate both harness trees with `node scripts/generate-pstack-harness-trees.mjs`; verify them with the same command plus `--check`.

## Tools and delegation

| Cursor | Antigravity mapping for pstack |
| --- | --- |
| `Task` | `invoke_subagent`, using the live tool schema. Give the worker its task, relevant context, and absolute paths to the installed skills; workers start without the parent's conversation. |
| `AskQuestion` | Ask in plain text if the session has no structured question tool. |
| Open a todolist | Maintain a task list in the conversation if no task-list tool is available. |
| Run another pstack skill | Read `<pstack>/skills/<name>/SKILL.md` with `view_file` and follow it. Resolve references relative to that file, regardless of catalog visibility or slash-command names. |
| `Grep`, `Glob`, `Read`, shell execution | Use the available search, file-reading, and terminal tools, such as `grep_search`, `view_file`, and `run_command`. |
| `generalPurpose` | The built-in `self` agent for ordinary helpers. |
| `poteto-agent`, `comment-sicko` | The corresponding generated agent under `<pstack>/agents/`. Pass the absolute poteto-mode skill path to `poteto-agent`. |
| `readonly: true` | Explicitly prohibit edits in the worker brief and inspect the resulting diff. This instruction alone is not a filesystem permission boundary. |
| `readonly: false` | Use the generated agent's tools within the session's existing permissions. |
| `environment: "cloud"` | Request the `branch` workspace option for isolation. This creates a local worktree, not a remote machine. |
| `environment: "local"` | Use `inherit` for the current workspace. |
| `cloud_base_branch` | Include the requested base in the brief; have the worker verify its checkout before changing files. |
| `run_in_background: true` | Omit the Cursor field; Antigravity subagents already execute asynchronously. |
| `resume` | Message an existing idle worker when supported and when the playbook allows reuse. Otherwise start a new worker with the earlier result in its brief. |
| `file_attachments` | Include the file paths in the brief. |

The generator converts Cursor agent metadata to `mainAgent: false`, `subagent: true`, an explicit tool list, and `commandExecutionPolicy: sandbox`. The grants are `view_file`, `grep_search`, `replace_file_content`, `run_command`, and `invoke_subagent`: both source agents can edit files, including comments, and call skills that delegate. These are tool names, not capability categories such as `filesystem`, `terminal`, or `code_execution`. Permissions still come from the host. Standalone workspace definitions belong in `.agents/agents/*.md`; the plugin bundles them in `agents/`. See [custom subagents](https://www.antigravity.google/docs/subagents/). If the current surface does not offer subagents, report that limitation before executing a workflow that requires them.

## Models and setup-pstack

These are pstack routing defaults, not equivalences between model vendors:

| Cursor choice | Antigravity choice |
| --- | --- |
| `claude-*` judgment, explanation, synthesis, or hardest-task default | `pro` |
| `grok-*` fast implementation or exploration default | `flash` |
| `gpt-*` or another explicit model not supported by the live schema | `inherit`; disclose the fallback. |
| `auto`, `inherit-parent` | `inherit` |
| `pstack-models.mdc` | `<workspace>/.agents/rules/pstack-models.md` |

The generated `poteto-agent` inherits the dispatched role's model; `comment-sicko` defaults to `pro`. Honor a role override when the invocation schema supports it. Do not pass vendor model IDs (including Gemini 1.5 Pro or Claude 3.5 Sonnet) or Cursor effort suffixes as Antigravity tiers. Do not claim that a `pro`/`flash` panel compares different vendors.

For `setup-pstack`, replace its Cursor-specific detect/budget/write steps:

1. Detect the tiers supported by the live subagent schema. Offer only supported choices; use `inherit` if routing cannot be detected.
2. Read `.agents/rules/pstack-models.md` in the current workspace. Keep existing role choices and panel counts. Map source defaults with the table above.
3. Explain that this adapter selects tiers rather than translating Cursor reasoning budgets. Show every role and ask the user to confirm or change the choices. Do not invent effort-suffixed tiers. Preserve duplicate panel entries and their fan-out.
4. Write that workspace rule with `trigger: always_on`, a description, and the source skill's role labels. Store plain tier values, not a synthetic effort token. Replace the model rule only; preserve unrelated workspace rules. Report the file and selected tiers.

## Rules and paths

Translate `.cursor/rules/*.mdc` to `.agents/rules/*.md` while preserving the rule body. Map `alwaysApply: true` to `trigger: always_on`; otherwise use `trigger: glob` when globs are present, `trigger: model_decision` for description-based selection, or `trigger: manual` for explicitly invoked rules. Retain descriptions and glob patterns, and remove the Cursor activation field. Antigravity requires a valid trigger in modular rules and scans immediate Markdown children. See [rules](https://www.antigravity.google/docs/rules/).

| Cursor path or behavior | Antigravity mapping for pstack |
| --- | --- |
| `.cursor/skills/` | `.agents/skills/` for workspace skills. Keep bundled pstack skills under `<pstack>/skills/`. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | Use the installed Antigravity plugin location and its root `plugin.json`. Prefer the absolute path supplied by the parent; never search Cursor caches or choose an installation by a Cursor manifest version. |
| Always-applied rule | A Markdown rule with `trigger: always_on`, as above. |
| A GitHub link to `pstack/README.md` or `pstack/docs/guide/` | Read the corresponding bundled file under `<pstack>` when it exists. |
| `agent-transcripts`, `~/.cursor/projects/` | Use the current Antigravity conversation or explicitly supplied transcript. If no transcript is exposed, report the missing input; do not guess a private cache path or read another workspace's conversations. |

Antigravity's documented skill fields are `name` and `description`. The generated tree retains source frontmatter, including `disable-model-invocation`, but does not promise Cursor's catalog-hiding behavior. For those skills the generator adds an explicit-invocation instruction in the body; this is a prompt-level restriction, not host enforcement. See [agent skills](https://www.antigravity.google/docs/skills/).

## Cursor-only features

Report `Skipped in Antigravity: <step>. <reason>.` for unavailable Cursor Automations, routine state APIs, `SendToUser`, or Cursor cloud-agent infrastructure. Continue independent steps and name any missing output needed downstream. Do not substitute Antigravity scheduling without an explicit request. Existing Bugbot review threads remain ordinary forge review input; skip attempts to configure or wait for a nonexistent Bugbot integration. Replace a built-in PR tool with the forge command specified by the skill, such as `gh pr create`.

# pstack in Oh My Pi

pstack skills use Cursor names. In Oh My Pi (`omp`), read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

The tool names below come from the tool schemas and `omp config list` of a live omp 17.2.8 session. omp changes its tool shapes between releases, so when your schema differs, follow your schema.

## Tools

| Cursor | Oh My Pi |
| --- | --- |
| `Task` | `task`. One call takes a `tasks[]` array, and each item is one subagent. The item's `task` field is the whole assignment the subagent sees, so make it stand alone. The call's `context` is shared background that omp puts in front of every item. |
| `AskQuestion` | `ask`. In print mode (`omp -p`) it is absent, so state the question and your default in plain text, and go on only where the skill allows a default. |
| Open a todolist, or copy steps into the todolist tool | Use a todo tool if the session offers one. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<pstack>/skills/<name>/SKILL.md` and follow it. |
| `Grep`, `Glob` | `grep`, `glob` |

## Subagent fields

| Cursor | Oh My Pi |
| --- | --- |
| `subagent_type: generalPurpose` | Leave the item's `agent` out. That gives the general-purpose `task` agent. |
| `poteto-agent`, `comment-sicko` | omp does not load pstack's agent files. Leave `agent` out and put "Read `<pstack>/agents/<name>.md` and follow it." in the item's `task`. When the skill fixes the first line of a worker's brief, keep that line first. |
| The `model:` line in `poteto-agent`'s file | It holds a Cursor slug, and omp does not read that file. Ignore it, and pick the item's model as in Models. |
| `readonly: true` | Leave `agent` out, put "do not edit files, do not commit" in the `task`, and check `git status` afterward. This covers explainers, reviewers, and judges, even when the subagent also explores code. Use `agent: "scout"` only when the subagent returns a list of files or lines and no explanation or verdict. scout runs on omp's small `smol` model. |
| `readonly: false` | Leave `agent` out. |
| `environment: "cloud"` | When `omp config get task.isolation.mode` is not `none`, the tool isolates each item and returns its changes as a patch or a branch. When it is `none`, which is the default, make one git worktree per worker with `git worktree add`, name its absolute path in that item's `task`, and tell the worker to run every command from that path. Never run two writers in one checkout. Run `git status` in your own checkout afterward to catch stray writes. |
| `environment: "local"` | Omit. |
| A subagent's reasoning level, such as the one poteto-mode's Subagents section asks you to pick | A `task` item has no reasoning field. The `thinkingLevel` in the item's agent file sets it, as in Models. With no such agent, the item runs at the session's level. |
| `cloud_base_branch: <b>` | Tell the worker to check out `<b>` first, or make its worktree from `<b>`. |
| `run_in_background: true` | Omit. The items in one call run together, up to `task.maxConcurrency`. When the call returns only a "spawned in background" note, wait for the results with the `hub` tool's `wait` op before you read them. |
| `resume` | Spawn a new item and paste the earlier result into its `task`. |
| `file_attachments` | List the paths in the item's `task`. |

## Models

A `task` item has no model field, but an agent file can set one. omp reads agent files from `~/.omp/agent/agents/` and from `.omp/agents/` in the project. The `model:` and `thinkingLevel:` lines in a file's frontmatter apply to every item that names that agent. When a row below gives an agent name, it replaces the one from Subagent fields. Keep the read-only instruction and the `git status` check.

| Cursor | Oh My Pi |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | When the role file maps the role to a value, use that value, as in the last row. Otherwise drop the slug. The item runs on the session model, and you say so. |
| A `gemini-*`, `grok-*`, `gpt-*`, or other slug | The same rule. |
| `auto` or `inherit-parent` | Nothing to pass. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.omp/agent/pstack-models.md`. omp does not load it, so read it before you pick a model. If the file or the role's line is missing, use the skill's default slug and map it with the rows above. |
| A role value `<provider>/<model> <thinking>`, such as `openai-codex/gpt-5.6-sol high` | `agent: "pstack-<value>"`. Write `<value>` in lowercase and replace each run of characters other than letters and digits with one hyphen, so this example is `pstack-openai-codex-gpt-5-6-sol-high`. setup-pstack writes that agent file. If the file is missing, leave `agent` out, and say that the item ran on the session model. |

## setup-pstack

Follow its steps with these changes:

- Detect. The detected models are the ids that `omp models` lists, written `<provider>/<model>`, each with a level from its thinking column. Write a real model as `<provider>/<model> <thinking>`, such as `openai-codex/gpt-5.6-sol high`. A model with no thinking levels is its id alone. The level is the last token, so the budget step works as written.
- Defaults. Map each default slug to the detected model of the same family, at the slug's effort. A slug with no detected model becomes `inherit-parent`.
- Write. Write `~/.omp/agent/pstack-models.md` with no frontmatter, then the comment lines, the `# budget` line, and one line per role from step 5. Overwrite the whole file. Then write one agent file per distinct role value to `~/.omp/agent/agents/pstack-<value>.md`, named as in Models. Its frontmatter has `name` set to that name, a one-line `description`, `model` as a one-item list that holds the model id, and `thinkingLevel` set to the level when there is one. Under the frontmatter, write `Follow the task you are given.` Delete any `pstack-*.md` agent file that no role uses any more. Never put the role lines in `AGENTS.md`.

## Paths

| Cursor | Oh My Pi |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.omp/skills/`, `.pi/skills/`, `.claude/skills/`, or `.agents/skills/` in the project. `~/.pi/agent/skills/` for every project. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | pstack has no omp plugin package. `<pstack>` is the checkout that the linked skills point into. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`. omp never reads `.mdc` files. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.omp/agent/sessions/<folder>/<timestamp>_<session-id>.jsonl`. Folder names differ between omp versions, so match on the `cwd` in each file's second line, the one with `type: "session"`. Line 1 is a title slot and the messages start at line 3. Read only this workspace's sessions. |

## Cursor-only features

Oh My Pi has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in Oh My Pi: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | Oh My Pi |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to isolation or a worktree, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |

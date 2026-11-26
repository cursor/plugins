# pstack in OpenCode

pstack skills use Cursor names. In OpenCode, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

The tool names below come from the tool list of a live OpenCode 2.3.2 session. OpenCode renames tools between major versions, so when your schema differs, follow your schema.

## Tools

| Cursor | OpenCode |
| --- | --- |
| `Task` | `subagent`. Its fields are `agent`, `description`, `prompt`, `model`, and `sessionID`. OpenCode 1.x names this tool `task`. The call returns at once and the subagent runs in the background. Its result arrives later as a `<subagent>` message, so present it then, not from the call's reply. When the `task` permission is `ask`, each call waits for approval, so a headless run with no one to approve stops at the first subagent. |
| `AskQuestion` | `question`. A headless run has no one to answer, so ask in plain text there. |
| Open a todolist, or copy steps into the todolist tool | Use a todo tool if the session offers one. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<pstack>/skills/<name>/SKILL.md` and follow it. The `skill` tool does not offer skills marked `disable-model-invocation: true`, and most pstack skills are. |
| `Grep`, `Glob` | `grep`, `glob` |

## Subagent fields

| Cursor | OpenCode |
| --- | --- |
| `subagent_type: generalPurpose` | `agent: "general"` |
| `poteto-agent`, `comment-sicko` | OpenCode does not load pstack's agent files. Use `agent: "general"` and put "Read `<pstack>/agents/<name>.md` and follow it." in the prompt. When the skill fixes the first line of a worker's brief, keep that line first. |
| The `model:` line in `poteto-agent`'s file | It holds a Cursor slug, and OpenCode does not read that file. Map the slug with the Models table and pass it as `model` on the `subagent` call, or omit `model` when no listed id matches. |
| `readonly: true` | `agent: "explore"`, even when the call also names `generalPurpose`. The prompt also says "do not edit files, do not commit", and you check `git status` afterward. |
| `readonly: false` | `agent: "general"` |
| `environment: "cloud"` | OpenCode has no cloud or isolation field. Make one git worktree per worker with `git worktree add`, name its absolute path in the prompt, and tell the worker to run every command from that path. Never run two writers in one checkout. Run `git status` in your own checkout afterward to catch stray writes. |
| `environment: "local"` | Omit. |
| A subagent's reasoning level, such as the one poteto-mode's Subagents section asks you to pick | `subagent` has no reasoning field. Pass none. The model sets the level. |
| `cloud_base_branch: <b>` | Make the worker's worktree from `<b>`. |
| `run_in_background: true` | Omit. Every `subagent` call already runs in the background. |
| `resume` | Call `subagent` again with the earlier subagent's `sessionID` and the follow-up prompt. The subagent keeps what it learned in the first call. |
| `file_attachments` | List the paths in the prompt. |

## Models

| Cursor | OpenCode |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | The `model` field takes a `provider/model` id from `opencode models`. Use the listed id for the same model when there is one. Drop the effort and `-fast`. When no listed id matches, omit `model` so the agent runs on the session model, and say so. |
| A `gemini-*`, `grok-*`, `gpt-*`, or other slug | The same rule: the matching `provider/model` id from `opencode models`, or omit `model` and say so. |
| `auto`, `inherit-parent`, or no model named | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.config/opencode/pstack-models.md`, named in the `instructions` array of `~/.config/opencode/opencode.json`. OpenCode loads every `instructions` file into each new session, so its role lines are already in context. If they are not, read the file. If the file or the role's line is missing, use the skill's default slug and map it with the rows above. |
| A role value `<provider>/<model>`, such as `anthropic/claude-opus-5-5` | `model: "anthropic/claude-opus-5-5"` |

## setup-pstack

Follow its steps with these changes:

- Detect. The detected models are the ids that `opencode models` lists. Write a real model as `<provider>/<model>`.
- Defaults. Map each default slug with the rows above. A slug with no listed id becomes `inherit-parent`.
- Budget. OpenCode ids carry no effort token, so the budget step has nothing to move. Record the budget the user picks on the `# budget` line, leave the role lines as detected, and say so.
- Write. Write `~/.config/opencode/pstack-models.md` with no frontmatter, then the comment lines, the `# budget` line, and one line per role from step 5. Overwrite the whole file. Add its path to `instructions` in `~/.config/opencode/opencode.json` if it is not there. Never put the role lines in `AGENTS.md`.

## Paths

| Cursor | OpenCode |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.opencode/skills/`, `.claude/skills/`, or `.agents/skills/`, in the project or in the home directory |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | pstack has no OpenCode plugin package. `<pstack>` is the checkout that the linked skills point into. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md` in the project, or `~/.config/opencode/AGENTS.md` for every project. OpenCode never reads `.mdc` files. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | OpenCode keeps sessions in its database, not in files. `opencode session list` lists this project's sessions, newest first, and `opencode session export <id>` writes one as JSON. Read only this project's sessions. |

## Cursor-only features

OpenCode has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in OpenCode: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | OpenCode |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |

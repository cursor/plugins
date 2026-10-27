---
name: privos
description: Work in a PrivOS workspace with the official privos CLI - list rooms, read and post room messages, manage sandbox board projects and tasks, lists and items, files, and agent triggers. Use when the user mentions PrivOS, a PrivOS room, list, item, task, or agent.
---

# PrivOS

Use the official `privos` CLI (npm package `@privos_ai/privos`, Node.js 20+).
The CLI talks to two PrivOS APIs: the **hub** (rooms, messages, files, lists,
items, agents) and the **sandbox** board (projects and tasks).

Full command reference: https://github.com/PrivOS-AI/privos/blob/main/docs/cli/README.md

## Setup

Check that the CLI is installed with `privos --help`. If it is missing, run
`npm install -g @privos_ai/privos`, or use `npx @privos_ai/privos` in place of
`privos`.

Credentials come from environment variables. Never ask the user to paste a
token into chat, never pass tokens as flags, and never print them.

| Target | Environment |
|---|---|
| Hub URL | `PRIVOS_HUB_URL` |
| Hub user id | `PRIVOS_HUB_USER_ID` |
| Hub personal access token | `PRIVOS_HUB_AUTH_TOKEN` |
| Sandbox board URL | `PRIVOS_SANDBOX_URL` |
| Sandbox API key | `PRIVOS_SANDBOX_API_KEY` |

If a command exits with code `2` and reports missing config, tell the user
which variables to set. Exit code `1` means the request failed; show the HTTP
status and message the CLI printed.

## Reads

Reads change nothing and need no confirmation. Output is JSON by default; add
`--format table` for a readable list.

```bash
privos hub rooms list --format table
privos hub messages list --room ROOM_ID --kind channel --count 20
privos hub lists list --room ROOM_ID
privos hub items list --list LIST_ID
privos hub items search --list LIST_ID --term TEXT
privos hub agents list
privos sandbox projects list
privos sandbox tasks list --project PROJECT_ID --status in_progress
```

Find a room by name in `hub rooms list`, then use its room id. The room's `t`
field picks `--kind` for message reads: `c` is `channel`, `p` is `group`,
`d` is `direct`.

## Writes: dry run first, then confirm

Every mutating command is a dry run by default and sends nothing. Follow this
order for every write:

1. Run the command without `--confirm`. Show the user the printed request.
2. Ask the user to confirm that exact write.
3. Only after they confirm, run the same command again with `--confirm`.

Never add `--confirm` on the first attempt, and never confirm a different
command than the one the user approved.

```bash
privos hub messages send --room ROOM_ID --text "Hello from the agent"
privos hub messages send --room ROOM_ID --text "Hello from the agent" --confirm
```

Common writes:

```bash
privos hub messages send --room ROOM_ID --text TEXT
privos hub messages update --room ROOM_ID --id MSG_ID --text TEXT
privos hub items create --list LIST_ID --stage STAGE_ID --name NAME
privos hub items move --id ITEM_ID --stage STAGE_ID
privos sandbox tasks create --project PROJECT_ID --title TITLE --description TEXT
privos sandbox tasks update --id TASK_ID --status done
```

Deletes (`messages delete`, `items delete`, `lists delete`, `rooms delete`,
`tasks delete`) cannot be undone. Name the exact object in the confirmation
question.

## Scope

The CLI acts as the account whose token is configured, so results only include
what that account can access. Run `privos <command> --help` for flags not
listed here.

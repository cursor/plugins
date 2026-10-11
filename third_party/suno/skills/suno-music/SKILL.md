---
name: suno-music
description: Generate music, lyrics, covers, or audio variations with the Suno MCP server through Ace Data Cloud. Use when the user asks for a Suno song or wants to check an existing Suno task.
---

# Suno music in Cursor

Use the `suno` MCP tools supplied by this plugin. The hosted server is the source of truth for available actions, models, and argument schemas.

1. Check current [pricing and balance](https://platform.acedata.cloud/models) and use `suno_list_models` when the requested model is unclear.
2. For a first instrumental song, call `suno_generate_music` once with a short prompt, `instrumental: true`, and a currently available model. The response may contain only a `task_id`.
3. Call `suno_get_task` with that same `task_id` until the task is terminal. `pending` and `processing` are not finished songs. If the chat is interrupted, ask for the original task ID and continue querying it.
4. On success, return the audio links and open the completed file when possible. On failure, report the task error and ID. Never submit a second paid generation just to check progress.

Configure `ACEDATACLOUD_API_TOKEN` in **Customize → Plugins → Suno → Configure**; do not put it in chat, source files, or example prompts. For the exact first-run prompt and access steps, see the [README](../../README.md).

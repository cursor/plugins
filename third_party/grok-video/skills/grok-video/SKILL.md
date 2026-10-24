---
name: grok-video
description: Use Grok Video through the Ace Data Cloud MCP server in Cursor. Use for Grok Video video work or an existing task query.
---

# Grok Video in Cursor

This skill adapts the [existing Ace Data Cloud skill](https://github.com/AceDataCloud/Skills/tree/main/skills/grok-video). The live MCP schema is the source of truth for arguments and models.

1. Check [current price, balance, and service access](https://platform.acedata.cloud/models) before a paid call.
2. Submit with `grok_text_to_video` once. Save the returned `task_id` and use `grok_get_task` with that same ID until terminal. Pending is not a completed video; open the returned result URL on success. Never regenerate merely to poll.
3. Return the result, task ID if present, and any service error. Keep the API token out of chat and files.

Configure `ACEDATACLOUD_API_TOKEN` in **Customize → Plugins → Grok Video → Configure**. See the [first-run guide](../../README.md).

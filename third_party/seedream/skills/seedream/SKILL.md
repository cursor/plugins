---
name: seedream
description: Use Seedream through the Ace Data Cloud MCP server in Cursor. Use for Seedream image work or an existing task query.
---

# Seedream in Cursor

This skill adapts the [existing Ace Data Cloud skill](https://github.com/AceDataCloud/Skills/tree/main/skills/seedream-image). The live MCP schema is the source of truth for arguments and models.

1. Check [current price, balance, and service access](https://platform.acedata.cloud/models) before a paid call.
2. Submit with `seedream_generate_image` once. Save the returned `task_id` and use `seedream_get_task` with that same ID until terminal. Pending is not a completed image; open the returned result URL on success. Never regenerate merely to poll.
3. Return the result, task ID if present, and any service error. Keep the API token out of chat and files.

Configure `ACEDATACLOUD_API_TOKEN` in **Customize → Plugins → Seedream → Configure**. See the [first-run guide](../../README.md).

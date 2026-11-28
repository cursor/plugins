---
name: happy-horse
description: Use Happy Horse through the Ace Data Cloud MCP server in Cursor. Use for Happy Horse video work or an existing task query.
---

# Happy Horse in Cursor

This skill adapts the [existing Ace Data Cloud skill](https://github.com/AceDataCloud/Skills/tree/main/skills/happyhorse-video). The live MCP schema is the source of truth for arguments and models.

1. Check [current price, balance, and service access](https://platform.acedata.cloud/models) before a paid call.
2. Submit with `happyhorse_generate_video` once. Save the returned `task_id` and use `happyhorse_get_task` with that same ID until terminal. Pending is not a completed video; open the returned result URL on success. Never regenerate merely to poll.
3. Return the result, task ID if present, and any service error. Keep the API token out of chat and files.

Configure `ACEDATACLOUD_API_TOKEN` in **Customize → Plugins → Happy Horse → Configure**. See the [first-run guide](../../README.md).

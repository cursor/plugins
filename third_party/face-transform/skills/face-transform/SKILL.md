---
name: face-transform
description: Use Face Transform through the Ace Data Cloud MCP server in Cursor. Use for Face Transform face analysis work or an existing task query.
---

# Face Transform in Cursor

This skill adapts the [existing Ace Data Cloud skill](https://github.com/AceDataCloud/Skills/tree/main/skills/face-transform). The live MCP schema is the source of truth for arguments and models.

1. Check [current price, balance, and service access](https://platform.acedata.cloud/models) before a paid call.
2. Call `face_detect_keypoints` once and inspect the returned face analysis. This synchronous operation has no task ID to poll.
3. Return the result, task ID if present, and any service error. Keep the API token out of chat and files.

Configure `ACEDATACLOUD_API_TOKEN` in **Customize → Plugins → Face Transform → Configure**. See the [first-run guide](../../README.md).

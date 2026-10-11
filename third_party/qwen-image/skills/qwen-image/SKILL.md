---
name: qwen-image
description: Generate or edit Qwen Image pictures through Ace Data Cloud in Cursor and resume an existing Qwen Image task. Use when the user asks for a Qwen Image result.
---

# Qwen Image in Cursor

This plugin supplies a small local MCP server because the existing Ace Data Cloud MCP catalog has no dedicated Qwen Image server. Its request fields follow the current Qwen Image API contract used by the Ace Data Cloud Dify integration.

1. Check [current pricing and balance](https://platform.acedata.cloud/models) and confirm the account has Qwen Image access.
2. Call `qwen_image_generate` once with a prompt and a supported model. Keep the returned `task_id`. This submits a paid request even if the task is still pending.
3. Call `qwen_image_get_task` with that same ID until status is succeeded or failed. After an interruption, resume with the old ID; never generate again just to poll.
4. Open the completed HTTPS image URL and report the task ID and result. A pending response is not a finished image.

The API key is configured in **Customize → Plugins → Qwen Image → Configure** as `ACEDATACLOUD_API_TOKEN`. Do not place it in chat or files. See the [first-run guide](../../README.md).

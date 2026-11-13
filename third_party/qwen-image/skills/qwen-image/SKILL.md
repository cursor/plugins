---
name: qwen-image
description: Generate or edit Qwen Image pictures through Ace Data Cloud in Cursor and resume an existing Qwen Image task. Use when the user asks for a Qwen Image result.
---

# Qwen Image in Cursor

Use the existing Ace Data Cloud hosted Qwen Image MCP. Its live tool schemas are the source of truth for available models, arguments, and results.

1. Check [current pricing and balance](https://platform.acedata.cloud/models), confirm Qwen Image access, and use `qwen_image_list_models` when the requested model is unclear.
2. Call `qwen_image_generate` or `qwen_image_edit` once for the requested paid action. Keep the returned task ID even if the result is still pending.
3. Call `qwen_image_get_task` with that same ID until `finished_at` is non-null. An interim `response.success: false` with `finished_at: null` is still pending. Once finished, inspect `response.success`; after an interruption, resume with the old ID and never generate again just to poll.
4. On success, open a returned `response.data[].image_url` HTTPS link and report the task ID and result. A pending response is not a finished image.

The API key is configured in **Customize → Plugins → Qwen Image → Configure** as `ACEDATACLOUD_API_TOKEN`. Do not place it in chat or files. See the [first-run guide](../../README.md).

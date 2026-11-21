# First Qwen Image result

Copy this into Cursor Agent after installing the plugin and configuring its API key. The prompt contains no credential.

> Use the Qwen Image plugin to make one 1024×1024 image of a single blue paper sphere on a cream background, as a clean studio product photograph with no text. Check `qwen_image_list_models`; use `qwen-image-3.0`, `n: 1`, and `watermark: false` if available to this account. Call `qwen_image_generate` only once, save its task ID, then use `qwen_image_get_task` with the same ID until `finished_at` is non-null. A `response.success: false` while `finished_at` is null is still pending; do not generate again to poll. On completion, open the returned HTTPS image URL and tell me the original task ID. If it is still pending, give me that ID so I can resume.

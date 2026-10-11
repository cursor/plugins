# First Qwen Image result

Copy this into Cursor Agent after installing the plugin and configuring its API key. The prompt contains no credential.

> Use the Qwen Image plugin to make one 1024×1024 image of a single blue paper sphere on a cream background, as a clean studio product photograph with no text. Use `qwen-image-3.0`, `n: 1`, and `watermark: false` if available to this account. Call `qwen_image_generate` only once, save its task ID, then use `qwen_image_get_task` with the same ID until it succeeds or fails. Open the completed PNG URL and tell me the original task ID. If it is still pending, give me that ID so I can resume without another generation.

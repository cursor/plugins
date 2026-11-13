# Qwen Image for Cursor

Generate and edit Qwen Image pictures through [Ace Data Cloud](https://platform.acedata.cloud?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=qwen_image_cursor_shared_readme_platform_en) in Cursor. This focused plugin reuses the existing hosted Qwen Image MCP for generation, editing, model listing, and same-task retrieval. The live MCP schemas define available actions and arguments.

[简体中文教程](readme/README_zh_Hans.md) · [Copyable first-run prompt](examples/first-image.md) · [Current pricing](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=qwen_image_cursor_shared_readme_pricing_en)

## 1. Install

In Cursor 3.24, open **Customize → Browse Marketplace**, search for **Qwen Image**, confirm the **Ace Data Cloud Dev** author and Qwen Image logo, then click **Add**. Earlier Cursor versions may put Plugins under Settings. If the official listing is not live, copy this directory to `~/.cursor/plugins/local/qwen-image/`, then open **Customize → Plugins** and confirm the **Local** label. Local installation does not prove Marketplace publication.

## 2. Get the right API key

1. Sign in at [Ace Data Cloud Applications](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=qwen_image_cursor_shared_readme_api_key_en).
2. Open **General application** or a Qwen Image-specific application. Copy an existing service API key, or use **Manage Keys → Create** for a separate Cursor key.
3. Check Qwen Image access, [current pricing](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=qwen_image_cursor_shared_readme_pricing_en), and balance. If **Allowed APIs** restrictions are enabled, include both `/qwen-image/images` and `/qwen-image/tasks`.

Use a service API key, not a platform management token. Do not put it in prompts or repository files.

## 3. Configure the plugin

Open **Customize → Plugins → Qwen Image → Configure**, paste the key string into **Ace Data Cloud API token**, and click **Save**. Wait for Save to finish, then reopen Configure to confirm a masked value. Team administrators can configure the same variable in **Dashboard → Plugins → Configure**. Cursor uses `ACEDATACLOUD_API_TOKEN` in the hosted MCP Authorization header; the plugin adds `Bearer ` itself.

The transport is hosted HTTP; no local Node server is required:

```json
{
  "mcpServers": {
    "qwen-image": {
      "type": "http",
      "url": "https://qwen-image.mcp.acedata.cloud/mcp",
      "headers": {"Authorization": "Bearer ${ACEDATACLOUD_API_TOKEN}"}
    }
  }
}
```

## 4. Make and retrieve the first image

Paste the [first-image prompt](examples/first-image.md) into Cursor Agent. It checks `qwen_image_list_models`, then requests one `qwen_image_generate` call with model `qwen-image-3.0` when available, size `1024*1024`, count `1`, and no watermark. Use the live tool schema for supported values.

The paid generation returns a task ID while work may still be pending. Keep it. Call `qwen_image_get_task` with that **same** ID until `finished_at` is non-null. While `finished_at` is null, continue querying even if `response.success` is false. Once finished, `response.success: true` includes `response.data[].image_url`; `false` is a terminal failure. If the chat is interrupted, begin a new chat with “Query Qwen Image task <task_id>; do not generate again.” Open the returned HTTPS image and check it.

In **Ace Data Cloud → Usage/Billing**, match the one generation to its deducted Credits record. Task queries do not submit another generation. The plugin is free; API calls follow current service pricing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin not listed | Check the exact Qwen Image entry and author. A local plugin is separate from the public Marketplace. |
| MCP is not connected | Check the saved key and hosted endpoint, then reconnect the plugin. The plugin needs no local runtime. |
| 401 or 403 | Check the service key, expiration, Qwen Image access, balance, and both Allowed APIs. Paste only the key, without `Bearer `. If the same key works through the Ace API but Cursor reports an invalid token, confirm Save finished and restart Cursor before retrying a read-only task query. |
| Invalid model or size | Use a currently supported model and `WIDTH*HEIGHT` size such as `1024*1024`. |
| Pending or interrupted task | Query the original task ID; do not regenerate to poll. |
| Timeout or 5xx | Check the task and usage history before deciding whether another paid request is needed. |
| Image URL fails | Check terminal success and use the URL returned by that task. |

[Source](https://github.com/AceDataCloud/QwenImageCursor) · [Report a problem](https://github.com/AceDataCloud/QwenImageCursor/issues) · dev@acedata.cloud. The logo reuses the existing Ace Data Cloud Qwen Image integration asset. This is a tool plugin; it does not register a Cursor chat-model provider.

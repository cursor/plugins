# Qwen Image for Cursor

Generate and edit Qwen Image pictures through [Ace Data Cloud](https://platform.acedata.cloud) in Cursor. This focused plugin ships a dependency-free local MCP server with generation and same-task retrieval tools. It uses the current Qwen Image API contract already verified by the Ace Data Cloud Dify integration.

[简体中文教程](readme/README_zh_Hans.md) · [Copyable first-run prompt](examples/first-image.md) · [Current pricing](https://platform.acedata.cloud/models)

## 1. Install

Install [Node.js 20 or later](https://nodejs.org/en/download) and check `node --version` in a terminal. The plugin starts its local MCP server with `node`; it does not download packages or run a remote executable.

In Cursor 3.24, open **Customize → Browse Marketplace**, search for **Qwen Image**, confirm the **Ace Data Cloud Dev** author and Qwen Image logo, then click **Add**. Earlier Cursor versions may put Plugins under Settings. If the official listing is not live, copy this directory to `~/.cursor/plugins/local/qwen-image/`, then open **Customize → Plugins** and confirm the **Local** label. Local installation does not prove Marketplace publication.

## 2. Get the right API key

1. Sign in at [Ace Data Cloud Applications](https://platform.acedata.cloud/console/applications).
2. Open **General application** or a Qwen Image-specific application. Copy an existing service API key, or use **Manage Keys → Create** for a separate Cursor key.
3. Check Qwen Image access, [current pricing](https://platform.acedata.cloud/models), and balance. If **Allowed APIs** restrictions are enabled, include both `/qwen-image/images` and `/qwen-image/tasks`.

Use a service API key, not a platform management token. Do not put it in prompts or repository files.

## 3. Configure the plugin

Open **Customize → Plugins → Qwen Image → Configure**, paste the key string into **Ace Data Cloud API token**, and save. Team administrators can configure the same variable in **Dashboard → Plugins → Configure**. The plugin passes the configured value to its local MCP server as `ACEDATACLOUD_API_TOKEN` and adds the Bearer header itself.

The bundled `mcp.json` starts `server.mjs` from `CURSOR_PLUGIN_ROOT`. It uses Node's built-in fetch and no npm packages. If the MCP does not start, check that `node` is on Cursor's process PATH and reconnect the plugin.

## 4. Make and retrieve the first image

Paste the [first-image prompt](examples/first-image.md) into Cursor Agent. It requests one `qwen_image_generate` call with model `qwen-image-3.0`, size `1024*1024`, count `1`, and no watermark. Use a model available to your account; the current service contract is the source of truth.

The paid generation returns a `task_id` while work may still be pending. Keep it. Call `qwen_image_get_task` with that **same** ID until `status=succeeded` and an image URL appears. If the chat is interrupted, begin a new chat with “Query Qwen Image task <task_id>; do not generate again.” Open the returned HTTPS PNG and check the image.

In **Ace Data Cloud → Usage/Billing**, match the one generation to its deducted Credits record. Task queries do not submit another generation. The plugin is free; API calls follow current service pricing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin not listed | Check the exact Qwen Image entry and author. A local plugin is separate from the public Marketplace. |
| MCP server will not start | Run `node --version`, confirm Node 20+ is on Cursor's PATH, and reconnect the plugin. |
| 401 or 403 | Check the service key, expiration, Qwen Image access, balance, and both Allowed APIs. Paste only the key, without `Bearer `. |
| Invalid model or size | Use a currently supported model and `WIDTH*HEIGHT` size such as `1024*1024`. |
| Pending or interrupted task | Query the original task ID; do not regenerate to poll. |
| Timeout or 5xx | Check the task and usage history before deciding whether another paid request is needed. |
| Image URL fails | Check terminal success and use the URL returned by that task. |

[Source](https://github.com/AceDataCloud/QwenImageCursor) · [Report a problem](https://github.com/AceDataCloud/QwenImageCursor/issues) · dev@acedata.cloud. The logo reuses the existing Ace Data Cloud Qwen Image integration asset. This is a tool plugin; it does not register a Cursor chat-model provider.

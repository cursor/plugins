# Happy Horse for Cursor

Generate Happy Horse videos and retrieve the finished clip. This standalone plugin reuses the [Ace Data Cloud happyhorse MCP](https://github.com/AceDataCloud/MCPs/tree/main/happyhorse) and includes a focused Agent skill. Available tools and limits come from the live MCP schema.

[简体中文教程](readme/README_zh_Hans.md) · [Copyable first-run prompt](examples/first-run.md) · [Current pricing](https://platform.acedata.cloud/models)

## 1. Search and install

In Cursor 3.13 or later, open **Cursor Settings → Plugins**, search for **Happy Horse**, confirm **Ace Data Cloud Dev** and the service logo, then click **Install**. You can also use `/add-plugin happy-horse` in chat. If the official listing is not live, review this source under `~/.cursor/plugins/local/happy-horse/`; local installation does not prove Marketplace publication.

## 2. Get a service API key

1. Sign in at [Ace Data Cloud Applications](https://platform.acedata.cloud/console/applications).
2. Open **General application** or a service-specific application. Copy an existing API key, or use **Manage Keys → Create** for a separate Cursor key.
3. Confirm Happy Horse access, [current price](https://platform.acedata.cloud/models), and balance. If **Allowed APIs** restrictions are enabled, include /happyhorse/videos, /happyhorse/tasks.

Use a service API key, not a platform management token. Do not put it in chat or source files.

## 3. Configure the plugin

Under **Dashboard → Plugins → Configure**, select **Happy Horse** and set `ACEDATACLOUD_API_TOKEN` to the key string. Paste only the key; the plugin adds `Bearer `. Reconnect the MCP server if tools are missing. The hosted endpoint needs no local Python installation.

```json
{
  "mcpServers": {
    "happyhorse": {
      "type": "http",
      "url": "https://happyhorse.mcp.acedata.cloud/mcp",
      "headers": {
        "Authorization": "Bearer ${ACEDATACLOUD_API_TOKEN}"
      }
    }
  }
}
```

## 4. Run the first example

Open Cursor Agent and paste the [first-run prompt](examples/first-run.md). It asks for `happyhorse_generate_video`, model `happyhorse-1.1-t2v` and duration 3 seconds, resolution 720P, ratio 16:9, watermark false. The sample prompt is `A teal cube on a cream table, slow camera orbit, simple studio lighting, no text.`. Verify live model access and price before running.

Submit with `happyhorse_generate_video` once. Save the returned `task_id` and use `happyhorse_get_task` with that same ID until terminal. Pending is not a completed video; open the returned result URL on success. Never regenerate merely to poll.

Open the returned video and inspect it. In **Ace Data Cloud → Usage/Billing**, match this call to its deducted Credits record. The plugin is free; API calls follow current service pricing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin or tools are missing | Check the Happy Horse listing, configure the key, and reconnect MCP. |
| 401 or 403 | Check key validity, service access, balance, and Allowed APIs; do not include `Bearer ` in the configured value. |
| Invalid model or argument | Use the live tool schema and a model this account can access. |
| Pending task | Query the original task ID; do not regenerate to poll. |
| 429, timeout, or 5xx | Inspect the original task and usage history before another paid submission. |
| Result URL will not open | Confirm a terminal success and use the URL returned by that call. |

[Source](https://github.com/AceDataCloud/HappyHorseCursor) · [Report a problem](https://github.com/AceDataCloud/HappyHorseCursor/issues) · dev@acedata.cloud. The logo reuses an existing Ace Data Cloud integration asset. This tool plugin does not register a Cursor chat-model provider.

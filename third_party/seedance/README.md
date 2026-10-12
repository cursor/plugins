# Seedance for Cursor

Generate Seedance videos and retrieve the finished clip. This standalone plugin reuses the [Ace Data Cloud seedance MCP](https://github.com/AceDataCloud/MCPs/tree/main/seedance) and includes a focused Agent skill. Available tools and limits come from the live MCP schema.

[简体中文教程](readme/README_zh_Hans.md) · [Copyable first-run prompt](examples/first-run.md) · [Current pricing](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedance_cursor_shared_readme_pricing_en)

## 1. Search and install

In Cursor 3.24, open **Customize → Browse Marketplace**, search for **Seedance**, confirm **Ace Data Cloud Dev** and the service logo, then click **Add**. Older releases may put Plugins under Settings. You can also use `/add-plugin seedance` in chat. If the official listing is not live, review this source under `~/.cursor/plugins/local/seedance/`; local installation does not prove Marketplace publication.

## 2. Get a service API key

1. Sign in at [Ace Data Cloud Applications](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedance_cursor_shared_readme_api_key_en).
2. Open **General application** or a service-specific application. Copy an existing API key, or use **Manage Keys → Create** for a separate Cursor key.
3. Confirm Seedance access, [current price](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedance_cursor_shared_readme_pricing_en), and balance. If **Allowed APIs** restrictions are enabled, include /seedance/videos, /seedance/tasks.

Use a service API key, not a platform management token. Do not put it in chat or source files.

## 3. Configure the plugin

Open **Customize → Plugins → Seedance → Configure**, paste the key string into **Ace Data Cloud API token**, and click **Save**. Cursor uses it as `ACEDATACLOUD_API_TOKEN`; the plugin adds `Bearer `. Reconnect the MCP server if tools are missing. The hosted endpoint needs no local Python installation.

```json
{
  "mcpServers": {
    "seedance": {
      "type": "http",
      "url": "https://seedance.mcp.acedata.cloud/mcp",
      "headers": {
        "Authorization": "Bearer ${ACEDATACLOUD_API_TOKEN}"
      }
    }
  }
}
```

## 4. Run the first example

Open Cursor Agent and paste the [first-run prompt](examples/first-run.md). It asks for `seedance_generate_video`, model `doubao-seedance-2-0-mini-260615` and duration 4 seconds, resolution 480p, ratio 16:9, generate_audio false. The sample prompt is `A teal paper cube slowly rotates on a cream studio background. Static camera, no text.`. Verify live model access and price before running.

Submit with `seedance_generate_video` once. Save the returned `task_id` and use `seedance_get_task` with that same ID until terminal. Pending is not a completed video; open the returned result URL on success. Never regenerate merely to poll.

Open the returned video and inspect it. In **Ace Data Cloud → Usage/Billing**, match this call to its deducted Credits record. The plugin is free; API calls follow current service pricing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin or tools are missing | Check the Seedance listing, configure the key, and reconnect MCP. |
| 401 or 403 | Check key validity, service access, balance, and Allowed APIs; do not include `Bearer ` in the configured value. |
| Invalid model or argument | Use the live tool schema and a model this account can access. |
| Pending task | Query the original task ID; do not regenerate to poll. |
| 429, timeout, or 5xx | Inspect the original task and usage history before another paid submission. |
| Result URL will not open | Confirm a terminal success and use the URL returned by that call. |

[Source](https://github.com/AceDataCloud/SeedanceCursor) · [Report a problem](https://github.com/AceDataCloud/SeedanceCursor/issues) · dev@acedata.cloud. The logo reuses an existing Ace Data Cloud integration asset. This tool plugin does not register a Cursor chat-model provider.

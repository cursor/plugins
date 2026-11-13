# Midjourney for Cursor

Generate Midjourney images and retrieve the finished image. This standalone plugin reuses the [Ace Data Cloud midjourney MCP](https://github.com/AceDataCloud/MCPs/tree/main/midjourney) and includes a focused Agent skill. Available tools and limits come from the live MCP schema.

[简体中文教程](readme/README_zh_Hans.md) · [Copyable first-run prompt](examples/first-run.md) · [Current pricing](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=midjourney_cursor_shared_readme_pricing_en)

## 1. Search and install

In Cursor 3.24, open **Customize → Browse Marketplace**, search for **Midjourney**, confirm **Ace Data Cloud Dev** and the service logo, then click **Add**. Older releases may put Plugins under Settings. You can also use `/add-plugin midjourney` in chat. If the official listing is not live, review this source under `~/.cursor/plugins/local/midjourney/`; local installation does not prove Marketplace publication.

## 2. Get a service API key

1. Sign in at [Ace Data Cloud Applications](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=midjourney_cursor_shared_readme_api_key_en).
2. Open **General application** or a service-specific application. Copy an existing API key, or use **Manage Keys → Create** for a separate Cursor key.
3. Confirm Midjourney access, [current price](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=midjourney_cursor_shared_readme_pricing_en), and balance. If **Allowed APIs** restrictions are enabled, include /midjourney/imagine, /midjourney/tasks.

Use a service API key, not a platform management token. Do not put it in chat or source files.

## 3. Configure the plugin

Open **Customize → Plugins → Midjourney → Configure**, paste the key string into **Ace Data Cloud API token**, and click **Save**. Cursor uses it as `ACEDATACLOUD_API_TOKEN`; the plugin adds `Bearer `. Reconnect the MCP server if tools are missing. The hosted endpoint needs no local Python installation.

```json
{
  "mcpServers": {
    "midjourney": {
      "type": "http",
      "url": "https://midjourney.mcp.acedata.cloud/mcp",
      "headers": {
        "Authorization": "Bearer ${ACEDATACLOUD_API_TOKEN}"
      }
    }
  }
}
```

## 4. Run the first example

Open Cursor Agent and paste the [first-run prompt](examples/first-run.md). It asks for `midjourney_imagine`, version 8.2, mode fast. The sample prompt is `A teal ceramic cube on a cream background, studio product photograph --ar 1:1`. Verify service access and price before running.

Submit with `midjourney_imagine` once. Save the returned `task_id` and use `midjourney_get_task` with that same ID until terminal. Pending is not a completed image; open the returned result URL on success. Never regenerate merely to poll.

Open the returned image and inspect it. In **Ace Data Cloud → Usage/Billing**, match this call to its deducted Credits record. The plugin is free; API calls follow current service pricing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin or tools are missing | Check the Midjourney listing, configure the key, and reconnect MCP. |
| 401 or 403 | Check key validity, service access, balance, and Allowed APIs; do not include `Bearer ` in the configured value. |
| Invalid model or argument | Use the live tool schema and a model this account can access. |
| Pending task | Query the original task ID; do not regenerate to poll. |
| 429, timeout, or 5xx | Inspect the original task and usage history before another paid submission. |
| Result URL will not open | Confirm a terminal success and use the URL returned by that call. |

[Source](https://github.com/AceDataCloud/MidjourneyCursor) · [Report a problem](https://github.com/AceDataCloud/MidjourneyCursor/issues) · dev@acedata.cloud. The logo reuses an existing Ace Data Cloud integration asset. This tool plugin does not register a Cursor chat-model provider.

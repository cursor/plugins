# Face Transform for Cursor

Analyze and transform faces through Ace Data Cloud. This standalone plugin reuses the [Ace Data Cloud face MCP](https://github.com/AceDataCloud/MCPs/tree/main/face) and includes a focused Agent skill. Available tools and limits come from the live MCP schema.

[简体中文教程](readme/README_zh_Hans.md) · [Copyable first-run prompt](examples/first-run.md) · [Current pricing](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=face_transform_cursor_shared_readme_pricing_en)

## 1. Search and install

In Cursor 3.24, open **Customize → Browse Marketplace**, search for **Face Transform**, confirm **Ace Data Cloud Dev** and the service logo, then click **Add**. Older releases may put Plugins under Settings. You can also use `/add-plugin face-transform` in chat. If the official listing is not live, review this source under `~/.cursor/plugins/local/face-transform/`; local installation does not prove Marketplace publication.

## 2. Get a service API key

1. Sign in at [Ace Data Cloud Applications](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=face_transform_cursor_shared_readme_api_key_en).
2. Open **General application** or a service-specific application. Copy an existing API key, or use **Manage Keys → Create** for a separate Cursor key.
3. Confirm Face Transform access, [current price](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=face_transform_cursor_shared_readme_pricing_en), and balance. If **Allowed APIs** restrictions are enabled, include /face/analyze.

Use a service API key, not a platform management token. Do not put it in chat or source files.

## 3. Configure the plugin

Open **Customize → Plugins → Face Transform → Configure**, paste the key string into **Ace Data Cloud API token**, and click **Save**. Cursor uses it as `ACEDATACLOUD_API_TOKEN`; the plugin adds `Bearer `. Reconnect the MCP server if tools are missing. The hosted endpoint needs no local Python installation.

```json
{
  "mcpServers": {
    "face": {
      "type": "http",
      "url": "https://face.mcp.acedata.cloud/mcp",
      "headers": {
        "Authorization": "Bearer ${ACEDATACLOUD_API_TOKEN}"
      }
    }
  }
}
```

Use only images you have permission to process. The example is an existing public fictional test image.

## 4. Run the first example

Open Cursor Agent and paste the [first-run prompt](examples/first-run.md). It asks for `face_detect_keypoints`, mode 1. The sample image_url is `https://platform2.cdn.acedata.cloud/seedream/00355681-7e81-49a4-a8fc-d2165fe1e9fd.jpg`. Verify service access and price before running.

Call `face_detect_keypoints` once and inspect the returned face analysis. This synchronous operation has no task ID to poll.

Inspect the returned keypoint data for the supplied image. In **Ace Data Cloud → Usage/Billing**, match this call to its deducted Credits record. The plugin is free; API calls follow current service pricing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin or tools are missing | Check the Face Transform listing, configure the key, and reconnect MCP. |
| 401 or 403 | Check key validity, service access, balance, and Allowed APIs; do not include `Bearer ` in the configured value. |
| Invalid model or argument | Use the live tool schema and a model this account can access. |
| 429, timeout, or 5xx | Inspect the original task and usage history before another paid submission. |
| Empty or unexpected face result | Check that the image URL is reachable and contains a clear consenting adult face. |

[Source](https://github.com/AceDataCloud/FaceTransformCursor) · [Report a problem](https://github.com/AceDataCloud/FaceTransformCursor/issues) · dev@acedata.cloud. The logo reuses an existing Ace Data Cloud integration asset. This tool plugin does not register a Cursor chat-model provider.

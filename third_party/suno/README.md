# Suno for Cursor

Generate Suno music in Cursor through the [Ace Data Cloud](https://platform.acedata.cloud) hosted MCP server. The plugin provides Suno's music, lyrics, audio editing, and task-query tools, plus a short skill for safe async use. The hosted tool schemas determine the available actions and models.

[简体中文教程](readme/README_zh_Hans.md) · [Copyable first-run prompt](examples/first-song.md) · [Current pricing](https://platform.acedata.cloud/models)

## 1. Find and install Suno

In Cursor 3.13 or later, open **Cursor Settings → Plugins**, search for **Suno**, and check that the author is **Ace Data Cloud Dev** and the logo is the Suno mark. Click **Install**. The chat command `/add-plugin suno` is another entry point. If the official listing has not appeared yet, this source can be reviewed locally under `~/.cursor/plugins/local/suno/`; local installation does not prove Marketplace publication.

## 2. Get an API key with Suno access

1. Sign in at [Ace Data Cloud Applications](https://platform.acedata.cloud/console/applications).
2. Open **General application** or a Suno-specific application. Copy an existing API key, or use **Manage Keys → Create** for a separate Cursor key.
3. Check that Suno is enabled and that your balance covers the [current price](https://platform.acedata.cloud/models). If you restrict allowed APIs, include generation `/suno/audios` and retrieval `/suno/tasks`.

Use the API key, not a platform management token. Keep it out of prompts and repository files.

## 3. Configure the plugin

Open **Dashboard → Plugins → Configure**, select **Suno**, and set `ACEDATACLOUD_API_TOKEN` to the key string. Cursor substitutes it into the MCP Authorization header. Paste only the key: the plugin adds `Bearer ` itself. Reconnect the plugin if its tools do not appear.

The transport is a hosted HTTP MCP endpoint; no Python or local server is required:

```json
{
  "mcpServers": {
    "suno": {
      "type": "http",
      "url": "https://suno.mcp.acedata.cloud/mcp",
      "headers": {"Authorization": "Bearer ${ACEDATACLOUD_API_TOKEN}"}
    }
  }
}
```

## 4. Make and retrieve the first song

Open an Agent chat and paste the [first-song prompt](examples/first-song.md). It asks the agent to check available models and price, call `suno_generate_music` **once**, then use `suno_get_task` with the returned `task_id`. `chirp-v6` is an example only if it appears in the live model list; use a model your account can access.

The generation call can return an accepted task while its audio is still pending. Keep the task ID. If Cursor stops or the task remains pending, start a new chat and say: “Use `suno_get_task` to check task `<task_id>`; do not generate a new song.” A completed response contains playable audio URLs. Open an actual returned URL and check the file plays before treating the run as finished.

Task queries use the same ID and do not submit a second generation. Check **Ace Data Cloud → Usage/Billing** for the single generation record and its deducted Credits; the plugin itself is free, and API usage follows current service pricing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin or tools are missing | Confirm the correct Suno listing is installed, configure the key, then reconnect the MCP server. A local copy is separate from the public Marketplace. |
| 401 or 403 | Check the full key, expiration, Suno access, balance, and allowed generation/retrieval APIs. Do not include `Bearer ` in the configured value. |
| Invalid model or argument | Ask `suno_list_models` and use the live tool schema. Models and limits can change. |
| Pending task | Query the original task ID again. Do not rerun generation to poll. |
| 429, timeout, or 5xx | Wait and inspect the original task or usage history before deciding whether another paid submission is needed. |
| Audio URL will not open | Confirm the task succeeded and use the URL returned by that completed task. |

The exact Suno MCP server and package source are maintained in [AceDataCloud/MCPs](https://github.com/AceDataCloud/MCPs/tree/main/suno). Report a plugin issue at [SunoCursor issues](https://github.com/AceDataCloud/SunoCursor/issues) with the task ID or trace ID, never your key. The logo reuses the existing Ace Data Cloud Suno integration asset.

This is a tool plugin. It does not register a Cursor chat-model provider.

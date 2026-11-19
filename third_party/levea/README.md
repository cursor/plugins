# Levea

Cursor plugin that connects agents to [Levea](https://www.livecore.ai) through Levea's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Describe an edit in plain language and get a finished MP4: extract viral clips from long recordings, apply 280+ animated caption templates, reframe 16:9 video to 9:16 with active speaker tracking, remove silences, layer B-roll and motion graphics, add voiceover and music, manage brand kits, and export for TikTok, Reels, Shorts, and YouTube.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Levea**.
3. Click **Install**, then complete the Levea sign-in prompt at `livecore.ai` and click **Allow access**.

Or run `/add-plugin levea` in chat.

In Grok Bot, open **Settings → Plugins**, install **Levea**, and complete the same Levea sign-in.

## MCP

```json
{
  "mcpServers": {
    "levea": {
      "type": "http",
      "url": "https://api.livecore.ai/api/v1/misc/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE (`S256`) and Dynamic Client Registration (`https://api.livecore.ai/api/v1/misc/oauth/register`) against `api.livecore.ai`, with the `levea` scope (advertised at `https://api.livecore.ai/.well-known/oauth-protected-resource/api/v1/misc/mcp`). Cursor registers itself and prompts for Levea sign-in when the plugin connects, so there is no API key or client ID to configure.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path and display the Connect card.

Levea also accepts a personal API key via `Authorization: Bearer <LEVEA_API_KEY>` for non-OAuth clients. Cursor and Grok Bot support OAuth, so you do not need an API key.

## Before you connect

You need a Levea account (`https://www.livecore.ai`). New accounts can be created for free during first sign-in.

## What agents can do

| Area | Tools |
| --- | --- |
| Autonomous editing (Mode A) | `autonomous_edit`, `autonomous_edit_streaming`, `queue_edit` |
| Direct canonical actions & preview (Mode B) | `search_tools`, `get_action_schema`, `execute_action`, `execute_batch`, `render_preview` |
| Built-in craft skills (100+ playbooks) | `search_skills`, `load_skill`, `read_skill_resource` |
| Deterministic layer shortcuts | `update_layer`, `delete_layer`, `trim_layer`, `apply_transition` |
| Job & task polling | `check_job_status`, `check_task_status`, `get_active_task` |
| Caption templates (280+ styles) | `list_caption_templates`, `apply_caption_template`, `save_caption_template`, `save_current_caption_template`, `delete_caption_template` |
| Brand kits | `list_brand_kits`, `get_brand_kit`, `create_brand_kit`, `update_brand_kit`, `delete_brand_kit` |
| Projects | `list_projects`, `get_project`, `create_project`, `delete_project` |
| Assets | `asset_upload_url`, `list_assets`, `delete_asset`, `transcribe_asset` |
| Diagnostics | `editor_health` |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Send the full editing goal in one `autonomous_edit` or `queue_edit` call rather than splitting captions, 9:16 reframing, B-roll, and export across separate calls.
- Full edits and cloud MP4 exports can take several minutes; poll `check_task_status`, `check_job_status`, or `get_active_task` rather than re-invoking `autonomous_edit`.
- Set `requirePlanApproval: true` on `autonomous_edit` to pause after planning and confirm before executing destructive or multi-step edits.
- `delete_project`, `delete_asset`, `delete_brand_kit`, and `delete_caption_template` are irreversible.

## Docs

- Levea: https://www.livecore.ai
- Source and MCP docs: https://github.com/brajendrak00068/agentic-ai-video-production/blob/main/mcp-server/README.md
- Server URL: https://api.livecore.ai/api/v1/misc/mcp
- Support: brajendra@livecore.ai

Logo is Levea's official app icon.

## License

MIT

# FrameOS

Cursor plugin that connects agents to [FrameOS](https://frameos.studio) through FrameOS's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server, plus eight FrameOS skills.

Turn long videos into captioned short clips: submit a link or upload, track the render, restyle captions, export MP4s, make thumbnails, draft social copy, and post to connected accounts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FrameOS**.
3. Click **Install**, then complete the FrameOS sign-in prompt.

Or run `/add-plugin frameos` in chat.

## MCP

```json
{
  "mcpServers": {
    "frameos": {
      "type": "http",
      "url": "https://frameos.studio/mcp",
      "headers": {
        "X-FrameOS-Plugin-Version": "0.1.1"
      },
      "auth": {
        "CLIENT_ID": "xdXqonkwYm2XzM1Z",
        "scopes": [
          "frameos:mcp",
          "offline_access"
        ]
      }
    }
  }
}
```

Auth is OAuth with FrameOS's pre-registered public Cursor client ID. Signing in for the first time creates your FrameOS workspace.

## Skills

| Skill | Use it to |
| --- | --- |
| `frameos-clip` | Turn a long video link or local file into ranked short clips and export MP4s |
| `frameos-captions` | Restyle captions on finished clips |
| `frameos-thumbnails` | Make thumbnails from real frames |
| `frameos-publish` | Draft social copy and post to YouTube, Facebook, Instagram, or LinkedIn after you confirm |
| `frameos-find-moments` | Search transcripts and pull quotes |
| `frameos-library` | Browse older projects and collections |
| `frameos-repurpose` | Plan multi-step content packs |
| `frameos-setup` | Fix sign-in and connection problems |

## Example prompts

- "What's my FrameOS credit balance?"
- "Show the clips from my latest project."
- "Export the top clip as an MP4."

Posting always asks for confirmation first. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- FrameOS: https://frameos.studio
- Plugin docs: https://frameos.studio/plugin
- Source: https://github.com/theSatvik/frameos-plugins
- Server URL: https://frameos.studio/mcp

Skills, MCP config, and logo come from FrameOS's [`theSatvik/frameos-plugins`](https://github.com/theSatvik/frameos-plugins) repository (`skills/`, `.cursor-plugin/plugin.json`, and `assets/icon.png`).

## License

MIT

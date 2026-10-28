# Faceless

Cursor plugin that connects agents to [Faceless](https://faceless.so) through Faceless's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create AI-scripted, voiced, and captioned short-form videos, run automated series, publish or schedule posts to YouTube, TikTok, Instagram, Facebook, Threads, LinkedIn, and X, and check analytics.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Faceless**.
3. Click **Install**, then complete the Faceless sign-in prompt and choose which permissions to grant.

Or run `/add-plugin faceless` in chat.

## MCP

```json
{
  "mcpServers": {
    "faceless": {
      "type": "http",
      "url": "https://faceless.so/api/v1/mcp"
    }
  }
}
```

Auth is OAuth: Cursor prompts for Faceless sign-in when the plugin connects. An API key from https://faceless.so/team also works, sent as `Authorization: Bearer <key>`.

## Before you connect

You need a Faceless account. Publishing requires the social accounts you want to post to be connected in Faceless.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Videos | Create AI-scripted, voiced, and captioned short-form videos and check render status |
| Series | Run automated video series |
| Publishing | Publish or schedule posts to YouTube, TikTok, Instagram, Facebook, Threads, LinkedIn, and X |
| Analytics | Check post and channel analytics |

Example tools: `faceless_get_me`, `faceless_list_videos`, `faceless_create_video`, `faceless_get_video_status`. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Faceless account and permissions granted during sign-in.
- Publishing and scheduling post to real social accounts.

## Docs

- Faceless: https://faceless.so
- MCP docs: https://faceless.so/developers/docs/mcp
- Server URL: https://faceless.so/api/v1/mcp

Logo is the `assets/logo.png` mark from Faceless's official Cursor plugin repository ([Side-Products/faceless-cursor-plugin](https://github.com/Side-Products/faceless-cursor-plugin)). faceless.so was unreachable from the build environment when this plugin was added, so the submitted `https://faceless.so/logo.png` was not downloaded.

## License

MIT

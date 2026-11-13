# ManyMotions

Cursor plugin that connects agents to [ManyMotions](https://manymotions.com) through three hosted [Model Context Protocol](https://modelcontextprotocol.io/) servers.

ManyMotions turns a text prompt into AI images, short AI video clips, logo concepts and UGC-style video ads. The agent prepares each request and shows its credit cost for free, generates only when you ask, and returns the files from your ManyMotions account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **ManyMotions**.
3. Click **Install**, then sign in to ManyMotions when Cursor asks.

Or run `/add-plugin manymotions` in chat.

## MCP

```json
{
  "mcpServers": {
    "manymotions-video-image-generation": {
      "type": "http",
      "url": "https://manymotions.com/api/grok/mcp"
    },
    "manymotions-logo-maker": {
      "type": "http",
      "url": "https://manymotions.com/api/grok/logomaker/mcp"
    },
    "manymotions-ugc-video-ads": {
      "type": "http",
      "url": "https://manymotions.com/api/grok/ugc/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE against ManyMotions. Each server answers an unauthenticated request with `401` and a `WWW-Authenticate` header that points to its protected-resource metadata; the authorization server is `https://manymotions.com`, with dynamic client registration. Cursor opens the ManyMotions sign-in when the plugin connects.

## What agents can do

| Server | Tools | Capabilities |
| --- | --- | --- |
| `manymotions-video-image-generation` | `prepare_media_forge_project`, `generate_media_forge`, `get_media_forge_job` | Images or short video clips from a text prompt, with models such as Nano Banana, Flux, Kling, Veo and Seedance |
| `manymotions-logo-maker` | `prepare_logo_project`, `generate_logo`, `get_logo_job` | Up to four logo concepts as PNG images from a description of your brand |
| `manymotions-ugc-video-ads` | `prepare_ugc_video_ad`, `generate_ugc_video_ad`, `get_ugc_video_ad` | A short UGC-style video ad for TikTok, Reels and Shorts, with an AI presenter and voice, script and final cut |

`prepare_*` tools are free and return the credit cost. `generate_*` tools spend credits and run only when you ask. `get_*` tools report progress and return the links to the finished files.

The hosted runtime is the source of truth for tool names and schemas.

## Try it

- "Prepare a 9:16 video of a hot air balloon rising over misty hills at sunrise."
- "Generate it."
- "Prepare four logo concepts for a coffee shop called North Bean."
- "Prepare a UGC video ad for a reusable water bottle."

## Pricing

The plugin is free. Generating requires a ManyMotions account and uses its credits. Preparing is free and shows the exact credits before anything is spent.

## Docs and support

- ManyMotions: https://manymotions.com
- How the connectors work: https://manymotions.com/mcp
- Support: https://manymotions.com/support
- Privacy: https://manymotions.com/privacy
- Terms: https://manymotions.com/terms
- Contact: info@manymotions.com

Logo is the ManyMotions mark (512×512) from https://github.com/manymotions/cursor-plugins.

## License

MIT

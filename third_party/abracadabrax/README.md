# Abracadabrax

Cursor plugin that connects agents to [Abracadabrax](https://abracadabrax.app) through two hosted [Model Context Protocol](https://modelcontextprotocol.io/) servers.

Abracadabrax creates images, short videos and songs with generative AI. The agent prepares a draft and shows its price in credits for free, renders only after you confirm, and returns the file from your Abracadabrax account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Abracadabrax**.
3. Click **Install**, then sign in to Abracadabrax when Cursor asks.

Or run `/add-plugin abracadabrax` in chat.

## MCP

```json
{
  "mcpServers": {
    "abracadabrax-video-image-generation": {
      "type": "http",
      "url": "https://abracadabrax.app/api/grok/media/mcp"
    },
    "abracadabrax-song-generation": {
      "type": "http",
      "url": "https://abracadabrax.app/api/grok/song/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE against Abracadabrax. Each server answers an unauthenticated request with `401` and a `WWW-Authenticate` header that points to its protected-resource metadata; the authorization server is `https://abracadabrax.app`, with dynamic client registration. Cursor opens the Abracadabrax sign-in when the plugin connects.

## What agents can do

| Server | Tools | Capabilities |
| --- | --- | --- |
| `abracadabrax-video-image-generation` | `prepare_media_project`, `generate_media`, `get_media_job` | An image or a short video from a text prompt: pick the model, the aspect ratio and the length |
| `abracadabrax-song-generation` | `prepare_song_project`, `generate_song`, `get_song_job` | A finished song with vocals from lyrics written with the agent, or an instrumental track, in the genre and mood you pick |

`prepare_*` tools save a draft and return its credit cost, for free. `generate_*` tools start the render only after you confirm. `get_*` tools report progress and return the link to the finished file.

The hosted runtime is the source of truth for tool names and schemas.

## Try it

- "A red fox sleeping in fresh snow at dawn, photorealistic, square image"
- "A 5-second vertical clip of a paper boat sailing down a rainy street, cinematic"
- "Write a short upbeat pop song about a road trip with friends"

## Pricing

The plugin is free. Rendering requires an Abracadabrax account and uses its credits. Every draft shows its price in credits before anything is rendered, and nothing is charged until you confirm.

## Docs and support

- Abracadabrax: https://abracadabrax.app
- How the connectors work: https://abracadabrax.app/mcp
- Help: https://abracadabrax.app/support
- Privacy: https://abracadabrax.app/privacy
- Terms: https://abracadabrax.app/terms
- Contact: support@abracadabrax.app

Logo is the Abracadabrax mark (512×512) from https://github.com/abracadabrax-app/cursor-plugins.

## License

MIT

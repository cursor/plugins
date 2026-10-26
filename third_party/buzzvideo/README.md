# BuzzVideo

Cursor plugin that connects agents to [BuzzVideo](https://buzzvideo.ai) through BuzzVideo's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create marketing images, videos, AI avatar clips, and voiceovers from chat using your BuzzVideo account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **BuzzVideo**.
3. Click **Install**, then complete the BuzzVideo sign-in prompt.

Or run `/add-plugin buzzvideo` in chat.

## MCP

```json
{
  "mcpServers": {
    "buzzvideo": {
      "type": "http",
      "url": "https://webapi.buzzvideo.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for BuzzVideo sign-in when the plugin connects, and you choose which BuzzVideo workspace to connect.

## Before you connect

You need a BuzzVideo account. Generations use the credits in that account; plans and credits are managed on [buzzvideo.ai](https://buzzvideo.ai).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Images | Generate images from text, or restyle an uploaded product photo or reference image |
| Videos | Turn images into videos, make text-to-video clips, and create AI avatar videos |
| Voiceovers | Turn scripts into voiceovers with preset or cloned voices |
| Assets | Save results to your private BuzzVideo asset library |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the BuzzVideo account and workspace of the user who authorizes the connection.

## Docs

- BuzzVideo: https://buzzvideo.ai
- Server URL: https://webapi.buzzvideo.ai/mcp

The logo references BuzzVideo's submitted icon URL (`https://buzzvideo.ai/images/logo-icon-180.png`). buzzvideo.ai could not be reached when this plugin was added, so no local copy was committed.

## License

MIT

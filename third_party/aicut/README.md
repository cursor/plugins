# Aicut

Cursor plugin that connects agents to [Aicut](https://www.aicut.pro/) through Aicut's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Make AI videos, images, voiceovers and full AI Video Story episodes on Veo, Kling, Seedance and more, then post them to TikTok, YouTube and Instagram. Every generation is priced before it spends.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Aicut**.
3. Click **Install**, then sign in with your Aicut account and choose **Allow**.

Or run `/add-plugin aicut` in chat.

## MCP

```json
{
  "mcpServers": {
    "aicut": {
      "type": "http",
      "url": "https://mcp.aicut.pro/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with dynamic client registration, so Cursor prompts for Aicut sign-in when the plugin connects. There is no API key to configure.

## Before you connect

You need an Aicut account. Listing models and estimating prices is free; generating media spends tokens from the signed-in account.

## Example prompts

- "List your aicut video models."
- "Estimate a 5-second vertical Veo 3.1 video."

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Aicut: https://www.aicut.pro/
- Setup guide: https://www.aicut.pro/mcp
- Server URL: https://mcp.aicut.pro/mcp

Logo is `assets/logo.png` from Aicut's official [`aicut-pro/cursor-plugin`](https://github.com/aicut-pro/cursor-plugin) repository. www.aicut.pro could not be reached when this plugin was added, so the file was not downloaded from the website.

## License

MIT

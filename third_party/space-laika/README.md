# VisaPhoto

Cursor plugin that connects agents to [VisaPhoto](https://visaphoto.io) by [Space Laika](https://spacelaika.com) through VisaPhoto's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Turn a selfie into a visa or passport photo sized for official document rules, with a free watermarked preview.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **VisaPhoto**.
3. Click **Install**. No sign-in or API key is needed.

Or run `/add-plugin space-laika` in chat.

## MCP

```json
{
  "mcpServers": {
    "space-laika": {
      "type": "http",
      "url": "https://visaphoto.io/mcp"
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Formats | Prepare photos for Schengen, US (2×2 in), UK, Canada, China, India, Türkiye, and other visa and passport formats |
| Preview | Upload a selfie after the user consents and return a free watermarked preview with background, framing, and head size checked |
| Purchase | Point the user to visaphoto.io to buy and download the full-resolution files without the watermark |

The agent asks for consent before it sends a photo to VisaPhoto. Making a preview can take 1–2 minutes. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- VisaPhoto: https://visaphoto.io
- Space Laika: https://spacelaika.com
- Server URL: https://visaphoto.io/mcp

## License

MIT

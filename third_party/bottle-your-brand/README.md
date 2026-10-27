# Bottle Your Brand — Print Shop plugin

Turn any image into custom die-cut vinyl stickers printed by [Bottle Your Brand](https://www.bottleyourbrand.com/), a family-owned print shop in Bothell, Washington.

This plugin connects your agent to the Bottle Your Brand MCP server. Hand it a picture, logo, or drawing and it returns a link to the order page with your artwork already attached. It also answers sticker questions from the shop's own print specs and opens free tools for common artwork problems.

## What it can do

| Tool | What it does |
| :--- | :--- |
| `get_sticker_guidance` | The shop's answers on sizing, measuring, resolution, bleed, cut paths, material, outdoor life, minimums, pricing, and turnaround |
| `order_custom_stickers` | Takes a public image URL (PNG, JPG, or PDF) and returns a prefilled order link |
| `upload_sticker_artwork` | Shows an upload panel for artwork that lives on your device |
| `show_print_tool` | Opens a free tool: measure-by-photo, background remover, cutline generator, resolution tester, contrast check, size guide, or online designer |

The plugin also includes a `custom-stickers` skill that tells the agent when and how to use these tools.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Bottle Your Brand**.
3. Click **Install**.

Or run `/add-plugin bottle-your-brand` in chat.

No account, API key, or sign-in is needed.

## Try it

- "Make this logo into 3 inch die-cut stickers: https://example.com/logo.png"
- "What size sticker fits on a 20 oz water bottle?"
- "Is this image high enough resolution to print as a sticker?"
- "Remove the background from my photo so I can make a sticker of my dog."

## MCP

```json
{
  "mcpServers": {
    "print-shop": {
      "type": "http",
      "url": "https://mcp.bottleyourbrand.com/mcp"
    }
  }
}
```

The server is also listed in the official MCP registry as `com.bottleyourbrand/print-shop`.

## How ordering works

The tools never place or charge an order. They hand off to the Bottle Your Brand order page with your artwork attached, and you choose size and quantity and check out on [bottleyourbrand.com](https://www.bottleyourbrand.com/custom-stickers).

## Links

- [Custom stickers](https://www.bottleyourbrand.com/custom-stickers)
- [MCP documentation](https://www.bottleyourbrand.com/mcp-documentation)
- [Privacy policy](https://www.bottleyourbrand.com/privacy-policy)
- [Terms and conditions](https://www.bottleyourbrand.com/terms-and-conditions)
- Support: info@bottleyourbrand.com

## License

MIT for the contents of this repository. Bottle Your Brand and the Bottle Your Brand logo are trademarks of Liquid Designs, LLC.

# Canva

Cursor plugin that connects agents to [Canva](https://www.canva.com) through Canva's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Generate and edit designs, search your design library, upload and organize assets, work with brand kits and templates, and export to PDF, PNG, JPG, PPTX, or MP4 from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Canva**.
3. Click **Install**, then complete the Canva sign-in prompt.

Or run `/add-plugin canva` in chat.

In Grok Bot, open **Settings → Plugins**, install **Canva**, and complete the same Canva sign-in.

## MCP

```json
{
  "mcpServers": {
    "canva": {
      "type": "http",
      "url": "https://mcp.canva.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth. `https://mcp.canva.com` is its own authorization server and advertises dynamic client registration and Client ID Metadata Documents, with the authorization code flow and PKCE (S256), so there is no API key, client ID, or client secret to configure. Cursor or Grok Bot prompts for Canva sign-in when the plugin connects.

Canva also runs an MCP endpoint at `https://api.canva.com/connect/v1/mcp` for apps that bring their own client ID and secret from the [Developer Portal](https://www.canva.com/developers/). This plugin packages the connector endpoint instead, so no Developer Portal app is needed.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## Before you connect

You need a Canva account. Every user signs in individually with their own account — Canva stores designs, assets, and permissions per user and does not support organization-level or service-account auth for MCP. Core features work on the Free plan; some capabilities need Canva Pro or above. See [Canva pricing](https://www.canva.com/pricing/).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Designs | Search designs and folders, read pages, content, and presenter notes, generate designs from a prompt, create, copy, and merge designs |
| Editing | Apply edits through editing transactions and read design thumbnails |
| Images | Generate images, remove backgrounds, and separate image layers |
| Exports | Export designs as PDF, PNG, JPG, PPTX, or MP4, and resize designs for other channels (resize needs Pro) |
| Assets | Upload assets from a URL and browse your uploads |
| Folders | Create and search folders, list their items, and move items between them |
| Brand | Search brand templates, list brand kits, create designs from a template, and draft and publish templates (Pro and above) |
| Autofill | Autofill designs and brand templates from a dataset (Pro and above) |
| Comments | Read comments and replies, comment on a design, and reply |
| Imports | Import a design from a URL |

Pro and above is required for resizing, autofill, brand kits, and brand templates. The hosted runtime is the source of truth for tool names and schemas. See [Canva's MCP tool reference](https://www.canva.dev/docs/apps/mcp/tools/) for the full list, rate limits, and plan availability.

## Notes

- The connection grants access similar to signing in to Canva directly. Tools can create, edit, and delete content in your Canva account, and comments are visible to everyone with access to the design. Confirm the design before letting the agent edit or comment.
- Available operations match your own Canva permissions. Editing tools only work on designs and assets you can already edit.
- Design generation and image generation are asynchronous. The agent polls the returned job and should surface the design's edit link when it finishes.
- Exports on the Free plan are standard quality. Designs containing premium elements can fail to export with `license_required` until the elements are licensed.
- Revoke access by disconnecting the plugin or from your Canva account settings.

## Docs

- Canva MCP overview: https://www.canva.dev/docs/apps/mcp/
- Tools and rate limits: https://www.canva.dev/docs/apps/mcp/tools/
- Access and permissions: https://www.canva.dev/docs/apps/mcp/access/
- Server URL: https://mcp.canva.com/mcp

Logo is Canva's official mark, from the 180×180 web app icon published on canva.dev.

## License

MIT

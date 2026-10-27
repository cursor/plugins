# SecondPage

Cursor plugin that connects agents to [SecondPage](https://secondpage.cc) through SecondPage's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Publish reports, dashboards, decks, and guides as versioned web pages, and revise them from teammate comments.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SecondPage**.
3. Click **Install**, then complete the SecondPage sign-in prompt and press **Allow**.

Or run `/add-plugin secondpage` in chat.

## MCP

```json
{
  "mcpServers": {
    "secondpage": {
      "type": "http",
      "url": "https://mcp.secondpage.cc/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for SecondPage sign-in when the plugin connects, so there is no API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Pages | Publish work as a web page with a stable link; every edit becomes a new version |
| Comments | Read teammate comments on a page and revise it |
| Live data | Bind pages to Google Sheets, Google Analytics, Airtable, or CSV |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- New pages start private. Any sharing change waits for a person to approve it in SecondPage.

## Docs

- SecondPage: https://secondpage.cc
- Docs: https://secondpage.cc/docs/
- Server URL: https://mcp.secondpage.cc/mcp

## License

MIT

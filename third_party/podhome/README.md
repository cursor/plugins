# Podhome

Cursor plugin that connects agents to [Podhome](https://www.podhome.fm) through Podhome's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Manage your Podhome podcasts: list shows and episodes, draft and publish episodes, edit chapters, transcripts, clips and people, run Podhome AI, and read download analytics.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Podhome**.
3. Click **Install**, then complete the Podhome sign-in prompt.

Or run `/add-plugin podhome` in chat.

## MCP

```json
{
  "mcpServers": {
    "podhome": {
      "type": "http",
      "url": "https://serve.podhome.fm/api/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Podhome sign-in when the plugin connects. There is no API key to configure.

## Before you connect

You need a Podhome account. Podhome offers a 30-day trial at https://www.podhome.fm.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Shows and episodes | List shows and episodes, draft and publish episodes |
| Episode content | Edit chapters, transcripts, clips, and people |
| AI | Run Podhome AI on episodes |
| Analytics | Read download counts by show, episode, country, and podcast app |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Podhome account of the user who authorizes the connection.
- Publishing, scheduling, and deleting change live podcast feeds. Confirm before running them.

## Docs

- Podhome: https://www.podhome.fm
- Server URL: https://serve.podhome.fm/api/mcp

## License

MIT

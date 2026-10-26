# MyAnimeTracker

Cursor plugin that connects agents to [MyAnimeTracker](https://myanimetracker.com) through MyAnimeTracker's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Anime watch order, filler episode guides, and what's airing this week, from MyAnimeTracker's reviewed catalog.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **MyAnimeTracker**.
3. Click **Install**.

Or run `/add-plugin myanimetracker` in chat.

## MCP

```json
{
  "mcpServers": {
    "myanimetracker": {
      "type": "http",
      "url": "https://myanimetracker.com/api/mcp/account"
    }
  }
}
```

No account is needed for the read-only tools. The list tools ask you to sign in (OAuth) with a free myanimetracker.com account.

## What agents can do

| Tool | Sign-in | Capability |
| --- | --- | --- |
| `search_anime` | No | Look up a title |
| `get_watch_order` | No | Get a franchise's seasons, films, and specials in release order, with where a new viewer can start |
| `get_filler_guide` | No | See which episodes of a long-running series are filler |
| `whats_airing` | No | Check what's airing in the next few days (Japan dates) |
| `my_library` | Yes | See your own list |
| `add_to_list` | Yes | Add a series to your list |
| `mark_episodes_watched` | Yes | Mark episodes watched |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Write tools only add, never remove.
- Results carry structure only (order, counts, dates, episode numbers), safe-for-work titles only, and every answer names its data sources.

## Docs

- MyAnimeTracker: https://myanimetracker.com
- Setup: https://myanimetracker.com/connect
- Support: support@myanimetracker.com
- Server URL: https://myanimetracker.com/api/mcp/account

The logo is referenced by URL (`https://myanimetracker.com/logo-light-plate.png`) because the image could not be downloaded when this plugin was added.

## License

MIT

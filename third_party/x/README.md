# X

Cursor plugin that connects agents to the [X API](https://docs.x.com) through X's official hosted [Model Context Protocol](https://modelcontextprotocol.io/) server at `https://api.x.com/mcp`.

This plugin signs you in with OAuth as your own X account. It is no longer read-only: alongside searching and reading public X data, agents can manage your lists, bookmarks, blocks, and mutes.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **X**.
3. Click **Install**, then complete the OAuth sign-in when prompted.

Or run `/add-plugin x` in chat.

## MCP

```json
{
  "mcpServers": {
    "x": {
      "type": "http",
      "url": "https://api.x.com/mcp",
      "auth": {
        "CLIENT_ID": "NGdZYmo4VVp2T1BnRG55NlExOGQ6MTpjaQ",
        "scopes": [
          "tweet.read",
          "users.read",
          "follows.read",
          "space.read",
          "mute.read",
          "like.read",
          "list.read",
          "list.write",
          "block.read",
          "block.write",
          "bookmark.read",
          "bookmark.write",
          "developer.billing.write",
          "developer.write",
          "offline.access"
        ]
      }
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Posts | Fetch posts, see likers / reposters / quoters, recent counts |
| Search | Full-archive post search, user search, news search |
| Users | Look up users by id or handle; read a user's posts, timeline, and mentions |
| News & trends | Get news stories, get trends for a location (WOEID) |
| Follows, likes & Spaces | Read your follows, likes, and Spaces |
| Lists | Read and manage your lists |
| Bookmarks | Read and manage your bookmarks |
| Blocks & mutes | Read your blocks and mutes; add or remove blocks |
| Developer account | Read your X developer account settings and credit balance |

Posting is not included: the plugin does not request the `tweet.write` scope, so agents cannot publish posts as you.

## Setup

No token to paste — the plugin ships with X's OAuth client ID and requests the scopes above. On first use, Cursor opens a browser window where you sign in to X and approve access. The `offline.access` scope lets Cursor refresh the session automatically, so you only sign in once.

Requests run in your user context, so they count against your account's rate limits. You can revoke access at any time from your X account's connected apps settings.

## Scopes requested

`tweet.read`, `users.read`, `follows.read`, `space.read`, `mute.read`, `like.read`, `list.read`, `list.write`, `block.read`, `block.write`, `bookmark.read`, `bookmark.write`, `developer.billing.write`, `developer.write`, `offline.access`

## X documentation search

X also hosts an unauthenticated MCP server for its developer docs. Add it alongside this plugin if you want agents to look up endpoint details while they work:

```json
{
  "mcpServers": {
    "x-docs": {
      "url": "https://docs.x.com/mcp"
    }
  }
}
```

## Docs

- MCP servers for the X API: https://docs.x.com/tools/mcp
- Authentication overview: https://docs.x.com/fundamentals/authentication/overview
- X API v2 OpenAPI spec: https://api.x.com/2/openapi.json

Logo is X's official mark from the [X brand toolkit](https://about.x.com/en/who-we-are/brand-toolkit), placed on a black tile matching X's own app icon.

## License

MIT

# SellerPro 360

Cursor plugin that connects agents to [SellerPro 360](https://sellerpro360.com) through SellerPro 360's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

SellerPro 360 is an Amazon seller platform for review request automation and other seller tools. This server gives agents read-only access to SellerPro 360's public data: the Amazon seller community forum and the list of supported Amazon marketplaces.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SellerPro 360**.
3. Click **Install**.

Or run `/add-plugin sellerpro-international-business-technol` in chat.

## MCP

```json
{
  "mcpServers": {
    "sellerpro-international-business-technol": {
      "type": "http",
      "url": "https://sellerpro360-mcp-proxy-v2.vercel.app/mcp"
    }
  }
}
```

The server does not require sign-in. It only returns public data and cannot read seller account data or credentials.

## What agents can do

| Tool | Capability |
| --- | --- |
| `search_forum_posts` | Search public SellerPro 360 forum discussions about PPC, FBA, listings, and account health |
| `get_forum_post` | Read the full body of one public forum post by its slug |
| `list_amazon_marketplaces` | List supported Amazon marketplaces with marketplace ID, SP-API region, domain, and currency |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- SellerPro 360: https://sellerpro360.com
- Server URL: https://sellerpro360-mcp-proxy-v2.vercel.app/mcp

## License

MIT

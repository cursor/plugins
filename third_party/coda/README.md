# Coda

Cursor plugin that connects agents to [Coda](https://coda.io) through Coda's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and read Coda docs, pages, and tables, and create or update pages and rows with the same access the signed-in user has.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Coda**.
3. Click **Install**, then complete the Coda sign-in prompt.

Or run `/add-plugin coda` in chat.

## MCP

```json
{
  "mcpServers": {
    "coda": {
      "type": "http",
      "url": "https://docs.superhuman.com/apis/mcp"
    }
  }
}
```

Auth is OAuth 2 with PKCE. Cursor prompts for sign-in when the plugin connects. An OAuth connection is automatically scoped to both read and write.

## Before you connect

Coda is now **Superhuman Docs**, and the MCP server moved with it to `docs.superhuman.com`. Your existing Coda account, docs, and plan are unchanged.

The MCP server is in beta. Doc Makers on paid plans get the full experience; Doc Makers on free plans and Editors get a capped "free taste" (30 requests per week, 60 per month), and Editors are limited to read tools.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | Search across docs and pages |
| Docs & pages | Read, create, and update docs and pages |
| Tables & rows | Read and write table rows |
| Helpers | `url_decode` turns a pasted Coda URL into the IDs the other tools need |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the user who authorizes the connection.
- The older `https://coda.io/apis/mcp` address still serves existing connections, but Superhuman's changelog says new setups should use `docs.superhuman.com/apis/mcp` — so that is what this plugin ships.
- Superhuman also accepts a personal access token sent as `Authorization: Bearer <token>`, which lets you pick read-only, write-only, or read+write instead of OAuth's read+write. The token must be created with restriction type **MCP** or the server returns 401. Superhuman currently recommends the token path for Cursor because of refresh-token handling.
- The `coda-mcp` npm package is a community local server by a third-party maintainer, unrelated to this hosted endpoint.

## Docs

- Connect to the Coda MCP: https://help.superhuman.com/hc/en-us/articles/46210076980365-Connect-to-the-Coda-MCP
- Security recommendations: https://help.superhuman.com/hc/en-us/articles/46210118248205-Security-recommendations-for-the-Coda-MCP
- What's changing: Coda becomes Superhuman Docs: https://help.superhuman.com/hc/en-us/articles/46210093285773-What-s-changing-Coda-becomes-Superhuman-Docs
- Server URL: https://docs.superhuman.com/apis/mcp

Logo is Coda's official mark, from the `coda` GitHub organization.

## License

MIT

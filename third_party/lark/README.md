# Lark

Cursor plugin that connects agents to [Lark](https://www.larksuite.com) (Lark Suite, the international product) through Lark's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search, create, fetch, and update Lark Docs, work with doc comments and files, and read Lark IM groups and messages in the signed-in Lark account.

Official MCP introduction: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Lark**.
3. Click **Install**, then complete the Lark sign-in prompt.

Or run `/add-plugin lark` in chat.

Accounts on China-region Feishu should install the separate [Feishu](../feishu/) plugin instead. This plugin talks only to `mcp.larksuite.com`.

## MCP

```json
{
  "mcpServers": {
    "lark": {
      "type": "http",
      "url": "https://mcp.larksuite.com/mcp"
    }
  }
}
```

Auth is MCP OAuth (Bearer). Cursor discovers the authorization server when the plugin connects and prompts for Lark login. Lark supports Dynamic Client Registration, so there is no API token, client ID, client secret, or custom header to configure.

## Before you connect

You need a Lark Suite account. Unauthenticated requests to the server are rejected until that login completes.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Docs | Search, create, fetch, and update docs; doc comments; list docs |
| IM | Search groups, list group members, get and search messages, read a thread, and check read status |
| People and files | Look up the signed-in user, search users, and fetch files |

Advertised tools include `fetch-file-v2`, `get-user`, `search-user`, `list-docs-v2`, `search-groups`, `get-group-members`, `get-thread-messages`, and `get-read-status`, plus doc search/create/fetch/update, doc comments, and message get/search. The `offline_access` scope is advertised so the connection can refresh. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Lark user who authorizes the connection and cannot exceed that user's permissions.
- This plugin points only at Lark's official hosted endpoint. It does not wrap the local `@larksuiteoapi/lark-mcp` stdio server, and it does not take an app id, app secret, user access token, or `X-Lark-MCP-*` header.
- Lark hosts the server itself. OAuth metadata is discovered at connect time (protected resource `https://mcp.larksuite.com/.well-known/oauth-protected-resource/mcp`, authorization server `https://accounts.larksuite.com/mcp`, dynamic client registration `https://open.larksuite.com/open-apis/app/v1/dcr`).
- China-region Feishu is a separate plugin (`feishu`) pointing at `https://mcp.feishu.cn/mcp`.
- Revoke access at any time from your Lark account.

## Docs

- Lark MCP introduction: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction
- Server URL: https://mcp.larksuite.com/mcp

Logo is Lark's official bird mark, from the `larksuite` GitHub organization (Lark Technologies Pte. Ltd.).

## License

MIT

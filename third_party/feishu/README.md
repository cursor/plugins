# Feishu

Cursor plugin that connects agents to [Feishu](https://www.feishu.cn) (飞书, the China product) through Feishu's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search, create, fetch, and update Feishu docs, work with doc comments and files, and read Feishu IM groups and messages in the signed-in Feishu account.

Official MCP introduction: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Feishu**.
3. Click **Install**, then complete the Feishu sign-in prompt.

Or run `/add-plugin feishu` in chat.

Accounts on international Lark Suite should install the separate [Lark](../lark/) plugin instead. This plugin talks only to `mcp.feishu.cn`.

## MCP

```json
{
  "mcpServers": {
    "feishu": {
      "type": "http",
      "url": "https://mcp.feishu.cn/mcp"
    }
  }
}
```

Auth is MCP OAuth (Bearer). Cursor discovers the authorization server when the plugin connects and prompts for Feishu login. Feishu supports Dynamic Client Registration, so there is no API token, client ID, client secret, or custom header to configure.

## Before you connect

You need a Feishu account. Unauthenticated requests to the server are rejected until that login completes.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Docs | Search, create, fetch, and update docs; doc comments; list docs |
| IM | Search groups, list group members, get and search messages, read a thread, and check read status |
| People and files | Look up the signed-in user, search users, and fetch files |

The China server advertises the same tool surface as international Lark, including `fetch-file-v2`, `get-user`, `search-user`, `list-docs-v2`, `search-groups`, `get-group-members`, `get-thread-messages`, and `get-read-status`, plus doc search/create/fetch/update, doc comments, and message get/search. The `offline_access` scope is advertised so the connection can refresh. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Feishu user who authorizes the connection and cannot exceed that user's permissions.
- This plugin points only at Feishu's official hosted endpoint. It does not wrap the local `@larksuiteoapi/lark-mcp` stdio server, and it does not take an app id, app secret, user access token, or `X-Lark-MCP-*` header.
- Feishu hosts the server itself. OAuth uses the authorization server at `https://accounts.feishu.cn/mcp` and dynamic client registration at `https://open.feishu.cn/open-apis/app/v1/dcr`.
- International Lark Suite is a separate plugin (`lark`) pointing at `https://mcp.larksuite.com/mcp`.
- Revoke access at any time from your Feishu account.

## Docs

- Feishu MCP introduction: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction
- Server URL: https://mcp.feishu.cn/mcp

Logo is the official Lark/Feishu bird mark, from the `larksuite` GitHub organization (Lark Technologies Pte. Ltd.). Feishu uses the same bird as Lark.

## License

MIT

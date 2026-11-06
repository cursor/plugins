# Stable

Cursor plugin that connects agents to [Stable](https://usestable.com) through Stable's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find mail in a Stable mailbox, read scanned mail documents, and look up or call Stable API endpoints.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Stable**.
3. Click **Install**, then set your Stable API key (below).

Or run `/add-plugin stable` in chat.

## MCP

```json
{
  "mcpServers": {
    "stable": {
      "type": "http",
      "url": "https://mcp.usestable.com/mcp",
      "headers": {
        "x-api-key": "${STABLE_API_KEY}"
      }
    }
  }
}
```

Auth is a Stable **API key** sent in an `x-api-key` header. Create one in the Stable dashboard at https://dashboard.usestable.com/settings/api-keys, then set it in **Dashboard → Plugins → Configure**. Do not commit the key.

Stable's official API client documents the same header: "Your Stable API key. Passed as the `x-api-key` header on every request." See https://docs.usestable.com/reference/authentication.

## Before you connect

You need a Stable account and an API key. Tool calls run with the permissions attached to that key.

## What agents can do

| Tool | Capabilities |
| --- | --- |
| `find-mail` | Find mail in the Stable mailbox |
| `read-mail-document` | Read a scanned mail document |
| `list-endpoints` | List Stable API endpoints available to the key |
| `get-endpoint` | Get one Stable API endpoint |
| `search-endpoints` | Search Stable API endpoints |
| `execute-request` | Run a request against a Stable API endpoint |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- This plugin sends the API key as `x-api-key` on Streamable HTTP requests to `https://mcp.usestable.com/mcp`. That is the header Stable's public API client documents for `https://api.usestable.com`.
- Do not commit `STABLE_API_KEY`.

## Docs

- Stable: https://usestable.com
- API reference: https://docs.usestable.com
- Authentication: https://docs.usestable.com/reference/authentication
- API keys: https://dashboard.usestable.com/settings/api-keys
- Server URL: https://mcp.usestable.com/mcp

Logo is Stable's mark from the `useStable` GitHub organization. The usestable.com site was not reachable when this plugin was added, so the file was not downloaded from the website.

## License

MIT

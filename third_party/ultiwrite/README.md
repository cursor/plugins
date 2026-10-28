# Ultiwrite

Cursor plugin that connects agents to [Ultiwrite](https://dwsoffshorepartners.com) through Ultiwrite's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ultiwrite is an asymmetric diligence engine with document forensics. Upload authorized evidence and receive an investigated, source-backed assessment of what holds up, what does not, and what changes the decision.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Ultiwrite**.
3. Click **Install**, then complete the Ultiwrite sign-in prompt.

Or run `/add-plugin ultiwrite` in chat.

## MCP

```json
{
  "mcpServers": {
    "ultiwrite": {
      "type": "http",
      "url": "https://dwsoffshorepartners.com/api/integrations/ultiwrite/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Ultiwrite sign-in when the plugin connects.

## Before you connect

You need an Ultiwrite account. Sign in at https://engine.dwsoffshorepartners.com.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Evidence | Submit authorized documents and data files for analysis |
| Reports | Follow processing, then read saved findings and export reports |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Only upload evidence you are authorized to share.
- Tool calls run under the Ultiwrite account of the user who authorizes the connection.

## Docs

- Ultiwrite: https://dwsoffshorepartners.com
- Server URL: https://dwsoffshorepartners.com/api/integrations/ultiwrite/mcp

Logo is from the publisher's `dennis430/ultiwrite-plugins` GitHub repository.

## License

MIT

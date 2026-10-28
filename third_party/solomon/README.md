# Solomon

Cursor plugin that connects agents to [Solomon](https://www.solomon.com.br) through Solomon's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query e-commerce sales, orders, products, ad spend, marketing attribution, and site analytics from your Solomon account, with the same numbers as the Solomon platform.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Solomon**.
3. Click **Install**, then sign in with your Solomon account and choose the company.

Or run `/add-plugin solomon` in chat.

## MCP

```json
{
  "mcpServers": {
    "solomon": {
      "type": "http",
      "url": "https://mcp.solomon.com.br/mcp"
    }
  }
}
```

Auth is a Solomon account sign-in in the browser. There is no API key to configure.

## Before you connect

You need a Solomon account with access to at least one company.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Sales | Revenue and orders over a date range, with period-over-period comparisons |
| Products | Product-level sales performance |
| Marketing | Ad spend, ROAS, and marketing attribution by channel and campaign |
| Site | Site analytics |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Solomon permissions of the user who signs in, scoped to the company they choose.

## Docs

- Solomon: https://www.solomon.com.br
- Server URL: https://mcp.solomon.com.br/mcp

Logo is Solomon's 512×512 icon, downloaded from the URL Solomon supplied with the submission.

## License

MIT

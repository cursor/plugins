# Jerry

Cursor plugin that connects agents to [Jerry](https://jerry.ai) through Jerry's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Shop car, motorcycle, home, condo, and renters insurance across 100+ insurers: build the application in chat, request quotes, and get a final price. Buying the policy continues in the Jerry app.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Jerry**.
3. Click **Install**, then complete the Jerry sign-in prompt.

Or run `/add-plugin jerry` in chat.

## MCP

```json
{
  "mcpServers": {
    "jerry": {
      "type": "http",
      "url": "https://mcp.jerry.ai/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE against Jerry's customer sign-in (`https://auth-micro.prod.getjerry.com/customer`), which supports dynamic client registration, so there is no client ID or key to configure. The server answers `initialize` and `tools/list` without sign-in. The first tool call returns `401` with `resource_metadata`, and the client then prompts for Jerry sign-in.

## Before you connect

You need a Jerry account, or you create one at sign-in. You approve the access requested on Jerry's consent screen.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Account | Name, email, and phone on the Jerry account |
| Application | Start shopping, then save drivers, cars, homes, coverage, and discounts |
| Quotes | Request quotes, wait for results, and compare quotes by plan, coverage, and price |
| Final price | Request the final price for the quote the customer picks |

Tools: `jerry_get_account`, `jerry_start_shopping`, `jerry_update_application`, `jerry_request_quotes`, `jerry_request_final_price`, `jerry_wait`, `jerry_get_status`, and `jerry_get_quotes`. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Each quote or final-price request needs the customer's explicit yes to a confirmation the server returns. Prices are estimates until a final price comes back.
- Buying a policy is not available through the server. Quote links open the Jerry app.

## Docs

- Jerry MCP: https://jerry.ai/mcp/
- Server URL: https://mcp.jerry.ai/mcp

Logo is Jerry's official mark, from the 512×512 app icon on jerry.ai, resized to 192×192.

## License

MIT

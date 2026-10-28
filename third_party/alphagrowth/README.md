# AlphaGrowth

Cursor plugin that connects agents to [AlphaGrowth](https://alphagrowth.io) through AlphaGrowth's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Free crypto market data: project metrics (TVL, market cap, revenue, users), community growth (X, Telegram, Discord, Reddit), funding rounds and investors, chains, protocol fees, crypto treasury companies, and DAO treasuries.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **AlphaGrowth**.
3. Click **Install**.

Or run `/add-plugin alphagrowth` in chat.

## MCP

```json
{
  "mcpServers": {
    "alphagrowth": {
      "type": "http",
      "url": "https://alphagrowth.io/mcp"
    }
  }
}
```

No auth. The server needs no API key or sign-in.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Projects | Rank projects and read metrics such as TVL, market cap, revenue, and users |
| Community | Track growth on X, Telegram, Discord, and Reddit |
| Funding | Look up funding rounds and investors |
| Chains and fees | Read chain data and protocol fees |
| Treasuries | Look up crypto treasury companies and DAO treasuries |

All tools are read-only. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server allows 60 calls per minute per IP.

## Docs

- AlphaGrowth: https://alphagrowth.io
- Server URL: https://alphagrowth.io/mcp

Logo is the AlphaGrowth favicon from the `alphagrowth` GitHub organization (`alphagrowth/ag-euler`, `frontends/alphagrowth/public/favicons/favicon.svg`).

## License

MIT

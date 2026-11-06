# PitchBook

Cursor plugin that connects agents to [PitchBook](https://pitchbook.com) through PitchBook's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Research private companies, deals, investors, and funds.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **PitchBook**.
3. Click **Install**, then complete the PitchBook sign-in prompt.

Or run `/add-plugin pitchbook` in chat.

## MCP

```json
{
  "mcpServers": {
    "pitchbook": {
      "type": "http",
      "url": "https://premium.mcp.pitchbook.com/mcp"
    }
  }
}
```

Auth is OAuth. The server advertises `https://mcp.pitchbook.com` as its authorization server and supports dynamic client registration, so Cursor prompts for PitchBook sign-in when the plugin connects — there is no client ID or API key to configure.

## Before you connect

You need a PitchBook account with access to PitchBook's premium MCP server.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Companies | Look up private and public company profiles, financials, and funding history |
| Deals | Research VC, PE, and M&A transactions |
| Investors | Look up investor profiles and portfolios |
| Funds | Research fund details and performance |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the PitchBook entitlements of the user who authorizes the connection.

## Docs

- PitchBook: https://pitchbook.com
- Server URL: https://premium.mcp.pitchbook.com/mcp

Logo is PitchBook's sail mark from the `pitchbook` GitHub organization, resized to 256×256. pitchbook.com blocked automated requests when this plugin was added, so the file was not downloaded from the website.

## License

MIT

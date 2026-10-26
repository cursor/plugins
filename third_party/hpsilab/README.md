# HPSILab Quant Finance

Cursor plugin that connects agents to [HPSILab](https://hpsilab.com/) through HPSILab's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Quantitative stock analysis and pre-trade risk checks: evaluate stock risk, position sizing, and portfolio exposure before making an investment decision.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HPSILab Quant Finance**.
3. Click **Install**, then complete the HPSILab sign-in prompt.

Or run `/add-plugin hpsilab` in chat.

## MCP

```json
{
  "mcpServers": {
    "hpsilab": {
      "type": "http",
      "url": "https://hpsilab.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for HPSILab sign-in when the plugin connects.

## Before you connect

You need an HPSILab account. Usage is credit-based. No brokerage account is required, and the server never places trades.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Stock risk | Run quantitative risk analysis on a ticker |
| Pre-trade risk scan | Check a proposed trade or sample portfolio before you buy |
| Position sizing | Size positions and review portfolio exposure |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- HPSILab: https://hpsilab.com/
- Server URL: https://hpsilab.com/mcp

Logo is the HPSILab icon from the publisher's `haiyunsky/hpsilab-quant-finance-mcp` GitHub repository. hpsilab.com could not be reached when this plugin was added, so the submitted favicon was not downloaded.

## License

MIT

# Sugra API

Cursor plugin that connects agents to the [Sugra API](https://sugra.systems) through Sugra's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server, plus skills for finding the right endpoint, calling it with the right parameters, and citing the source and date of every figure.

Sugra API serves data from primary sources: economic indicators, central banks, market data, company filings, news, weather and climate, internet infrastructure, research datasets, and sanctions screening.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Sugra API**.
3. Click **Install**, then complete the Sugra sign-in prompt in your browser.

Or run `/add-plugin sugra-systems` in chat.

## MCP

```json
{
  "mcpServers": {
    "sugra-api": {
      "type": "http",
      "url": "https://mcp.sugra.ai/mcp"
    }
  }
}
```

Auth is OAuth 2.0. On first connect, Cursor opens the Sugra sign-in in the browser. If the server shows **Needs authentication**, open **Cursor Settings → Tools & MCPs**, find `sugra-api`, and select **Connect**. There is no API key to configure in the plugin.

## Before you connect

You need a Sugra account. A free account at [app.sugra.ai](https://app.sugra.ai) includes 50 requests a day.

## Skills

| Skill | Use |
| --- | --- |
| `using-sugra-api` | Map of the API, its product directions, and which skill to load next |
| `discover-and-call` | Find an operation, call it, and check the result answers the question |
| `envelope-and-attribution` | Parse responses and cite each figure's source and date |
| `auth-and-quota` | Keys, daily quota, and what to do on each error |
| `cross-domain-briefing` | Combine two or three directions in one answer |
| `live-docs` | Check current documentation when details may be stale |

The hosted runtime is the source of truth for tool names and schemas.

## Try it

- "Compare US and Germany CPI inflation rates over the last 5 years."
- "What does the Fed funds rate look like, and when was the last policy change?"
- "What is the three-day weather forecast for Rotterdam?"

## Docs

- Documentation: https://docs.sugra.ai
- Server URL: https://mcp.sugra.ai/mcp
- Source: https://github.com/Sugra-Systems/sugra-api-plugins
- Support: support@sugra.systems

The skills and logo are copied from the `cursor/` package in [Sugra-Systems/sugra-api-plugins](https://github.com/Sugra-Systems/sugra-api-plugins) at commit `4a6a636`.

## License

MIT

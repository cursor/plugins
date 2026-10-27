# Kiin

Cursor plugin that connects agents to [Kiin](https://kiin.co) through Kiin's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server for LinkedIn Ads.

Analyze live LinkedIn Ads campaign data against benchmarks from 1,000+ accounts: creative fatigue, demographics, lead quality, and influenced pipeline. Ask which campaigns are fatigued, where budget is wasted, or what pipeline LinkedIn influenced.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Kiin**.
3. Click **Install**, then complete the Kiin sign-in prompt.

Or run `/add-plugin kiin` in chat.

## MCP

```json
{
  "mcpServers": {
    "kiin": {
      "type": "http",
      "url": "https://mcp.kiin.co"
    }
  }
}
```

Auth is OAuth. Unauthenticated requests return `401`, and Cursor prompts for Kiin sign-in when the plugin connects. There is no API key to configure.

## Before you connect

You need a Kiin account connected to LinkedIn Ads.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Campaigns | List campaigns and compare performance with cross-account benchmarks |
| Creatives | Detect creative fatigue and find wasted budget |
| Audience | Break down demographics and lead quality |
| Pipeline | Report the pipeline LinkedIn Ads influenced |

Tools read by default. Campaign writes use preview-then-confirm. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Kiin: https://kiin.co
- Server URL: https://mcp.kiin.co
- Privacy: https://kiin.co/privacy-policy
- Support: adrian@kiin.co

Logo is the brand mark from Kiin's own plugin repository ([Adriman2/kiin-cursor-plugin](https://github.com/Adriman2/kiin-cursor-plugin)). The submitted logo URL (https://kiin.co/logo.png) could not be downloaded when this plugin was added.

## License

MIT

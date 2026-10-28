# Fit Shapes

Cursor plugin that connects agents to [Fit Shapes](https://fitshapes.com), the calorie counter and macro tracker for iPhone, through Fit Shapes' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read your food log, calorie and macro targets, weight trend, and estimated burn, and log a food or a weigh-in when you ask.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Fit Shapes**.
3. Click **Install**, then sign in on the Fit Shapes page that opens.

Or run `/add-plugin fitshapes` in chat.

## MCP

```json
{
  "mcpServers": {
    "fitshapes": {
      "type": "http",
      "url": "https://mcp.fitshapes.com/mcp"
    }
  }
}
```

Cursor prompts for Fit Shapes sign-in when the plugin connects. There is no API key to configure.

## Before you connect

You need a Fit Shapes account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Food log | Read logged foods and log a new food |
| Targets | Read calorie and macro targets and what is left today |
| Weight | Read the weight trend and log a weigh-in |
| Burn | Read estimated energy burn |

Writes ask before saving. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Fit Shapes: https://fitshapes.com
- Server URL: https://mcp.fitshapes.com/mcp

The logo points at the submitted URL `https://fitshapes.com/brand/fit-shapes-mark.png`. fitshapes.com was unreachable when this plugin was added, so no local logo file is committed yet.

## License

MIT

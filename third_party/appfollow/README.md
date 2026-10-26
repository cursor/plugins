# AppFollow

Cursor plugin that connects agents to [AppFollow](https://appfollow.io) through AppFollow's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server, plus the analyst workflows from the [AppFollow AI Toolkit](https://github.com/AppFollow/appfollow-ai-toolkit).

Analyze App Store and Google Play reviews, ratings and ASO from your AppFollow account: feedback reports, keyword and metadata suggestions, and competitor audits.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **AppFollow**.
3. Click **Install**, then complete the AppFollow sign-in prompt.

Or run `/add-plugin appfollow` in chat.

## MCP

```json
{
  "mcpServers": {
    "appfollow": {
      "type": "http",
      "url": "https://mcp.appfollow.io/mcp"
    }
  }
}
```

Auth is OAuth with your AppFollow account. Tool calls run under your own session and are billed to your workspace credits; the plugin bundles no API key or secret.

## Before you connect

You need an AppFollow account with at least one workspace. Adding apps or keywords requires a plan that allows writes.

## What agents can do

| Skill | Command | What it does |
| --- | --- | --- |
| `using-appfollow` | — | Shared rules the other skills read first: session setup, credit checks, the preview → approve → confirm ritual for writes, and error codes |
| `search` | `/search` | Find an app on the App Store or Google Play and start tracking it |
| `feedback-analysis` | `/feedback-analysis` | Review KPIs, rating and sentiment trends, anomalies, and top bugs and feature requests |
| `aso-analysis` | `/aso-analysis` | Keyword positions, keyword opportunities, an add-keyword loop, and metadata suggestions |
| `competitors` | `/competitors` | Find and track competitors and audit share of search, category position, and rating velocity |

Reports are written as self-contained HTML plus a `findings.json` file that follows `schemas/findings.schema.json`.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- AppFollow: https://appfollow.io
- Developer docs: https://developers.appfollow.io
- Source: https://github.com/AppFollow/appfollow-ai-toolkit
- Server URL: https://mcp.appfollow.io/mcp

Skills, commands, schema, and logo are copied from the AppFollow AI Toolkit repository (v1.3.0). The logo is the official 512×512 AppFollow mark shipped in that repository; appfollow.io was not reachable from the build environment when this plugin was added.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.

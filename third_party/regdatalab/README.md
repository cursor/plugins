# RegDataLab

Cursor plugin that connects agents to [RegDataLab](https://www.regdatalab.com) through RegDataLab's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server (FDA Data MCP).

Search FDA facilities, inspections, recalls, warning letters, 510(k)s, and drug labels for a company.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **RegDataLab**.
3. Click **Install**, then complete the RegDataLab sign-in prompt.

Or run `/add-plugin regdatalab` in chat.

## MCP

```json
{
  "mcpServers": {
    "regdatalab": {
      "type": "http",
      "url": "https://www.regdatalab.com/mcp"
    }
  }
}
```

Auth is OAuth: when the plugin connects, sign in and paste your RegDataLab API key on the RegDataLab consent page to approve read-only access. Clients without OAuth can send `Authorization: Bearer YOUR_API_KEY` instead. Never put an API key in the URL.

## Before you connect

Create an account at [regdatalab.com](https://www.regdatalab.com) and copy an API key from your dashboard.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Companies | Resolve a company to its FDA-registered facilities |
| Inspections | Look up inspections, NAI / VAI / OAI outcomes, and Form 483 observations |
| Enforcement | Search warning letters, recalls, and import alerts |
| Products | Look up 510(k), PMA, Drugs@FDA, NDC, and drug label records |
| Risk | Summarize manufacturing and compliance risk for a company |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- RegDataLab: https://www.regdatalab.com
- Connect guide: https://www.regdatalab.com/connect.md
- Server URL: https://www.regdatalab.com/mcp
- Privacy: https://www.regdatalab.com/privacy
- Terms: https://www.regdatalab.com/terms
- Support: https://www.regdatalab.com/support

## License

MIT

# RightsHold

Cursor plugin that connects agents to [RightsHold](https://www.rightshold.com) through RightsHold's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

RightsHold tells AI agents what they may use before they use it. Check any license for an intended use, read a website's AI/crawler policy, verify another agent (KYA), and get signed Rights Receipts as proof.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **RightsHold**.
3. Click **Install**.

Or run `/add-plugin rightshold` in chat.

## MCP

```json
{
  "mcpServers": {
    "rightshold": {
      "type": "http",
      "url": "https://www.rightshold.com/mcp"
    }
  }
}
```

Core checks are free and need no sign-in or API key. An optional key is available through the `sign_up` tool or at [rightshold.com](https://www.rightshold.com). Append `?toolset=all` to the server URL to expose every tool.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Licenses | Check whether a license (for example CC BY-NC 4.0) permits an intended use |
| AI policies | Read a website's AI crawler policy and see which crawlers are blocked or allowed |
| Attribution | Generate the credit line a license requires |
| Agent verification | Verify another agent (Know Your Agent) |
| Rights Receipts | Get signed receipts as proof of a rights check |

Start with the `start_here` tool. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- RightsHold: https://www.rightshold.com
- Server URL: https://www.rightshold.com/mcp

The logo points to RightsHold's hosted icon at https://www.rightshold.com/brand/apple-touch-icon.png. rightshold.com could not be reached when this plugin was added, so no local copy was committed.

## License

MIT

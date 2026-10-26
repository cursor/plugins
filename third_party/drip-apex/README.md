# Apex

Cursor plugin that connects agents to [Apex](https://dripagency.de) by Drip Trading GmbH through Apex's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Apex runs A/B tests on your online store and helps you decide what to test next. Connect your Apex shop to read experiments, goals, and results, create draft tests, build and preview variations, and save test ideas. Traffic activation and QA approval happen in the Apex app.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Apex**.
3. Click **Install**, then complete the Apex sign-in prompt.

Or run `/add-plugin drip-apex` in chat.

## MCP

```json
{
  "mcpServers": {
    "drip-apex": {
      "type": "http",
      "url": "https://app.drip-apex.com/api/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Apex sign-in when the plugin connects.

## Before you connect

You need an Apex account with access to a connected shop.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Experiments | List tests and read goals and results |
| Drafts | Create draft tests against existing goals |
| Variations | Inspect page elements, edit them, build, and visually preview variations |
| Ideas | Save test ideas for later |

Launching traffic and QA approval are done in the Apex app, not through the plugin. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Tool reference: https://docs.drip-apex.com/docs/mcp/tool-reference
- Server URL: https://app.drip-apex.com/api/mcp

The logo points to Apex's hosted app tile (`https://app.drip-apex.com/brand-kit/assets/apex-app-tile.svg`). The Apex and Drip hosts could not be reached when this plugin was added, so no local copy is committed.

## License

MIT

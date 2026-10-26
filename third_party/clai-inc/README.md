# Clai

Cursor plugin that connects agents to [Clai](https://app.goclai.com) through Clai's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Work with Clai deals, signature packages, tasks, and document insights from chat. After you sign in and choose organizations and permissions, agents can list and create deals, send documents for signature, manage tasks, and upload files to Insights.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Clai**.
3. Click **Install**, then complete the Clai sign-in prompt.

Or run `/add-plugin clai-inc` in chat.

## MCP

```json
{
  "mcpServers": {
    "clai-inc": {
      "type": "http",
      "url": "https://app.goclai.com/mcp"
    }
  }
}
```

Auth is OAuth over Streamable HTTP. Cursor prompts for Clai sign-in when the plugin connects. There is no client ID, client secret, or header to configure.

## Before you connect

You need a Clai account. During sign-in, the consent screen asks which organizations and permissions to grant.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Organizations | List the Clai organizations you granted access to |
| Deals | List and create deals |
| Signatures | Send documents for signature in signature packages |
| Tasks | Manage tasks |
| Insights | Upload files to Insights |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the organizations and permissions the user grants on the Clai consent screen.

## Docs

- Clai: https://app.goclai.com
- Server URL: https://app.goclai.com/mcp

The logo points at Clai's hosted image (`https://app.goclai.com/assets/images/logo.png`). It could not be downloaded when this plugin was added, so no local copy is committed yet.

## License

MIT

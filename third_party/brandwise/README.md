# Brandwise

Cursor plugin that connects agents to [Brandwise](https://brandwise.ai) through Brandwise's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Manage your brand's social media comments, DMs, and customer support emails. Read and reply to comments and messages from Instagram, Facebook, and TikTok, spot trending questions and complaints, hide spam, and keep your team's inbox organized. Replies draw on your Brandwise knowledge base, so they use your brand's own answers and voice.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Brandwise**.
3. Click **Install**, then complete the Brandwise sign-in prompt and choose which brands to share.

Or run `/add-plugin brandwise` in chat.

## MCP

```json
{
  "mcpServers": {
    "brandwise": {
      "type": "http",
      "url": "https://mcp.brandwise.ai/api/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Brandwise sign-in when the plugin connects. On the consent screen, pick the organization and brands the agent may access.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | List connected Instagram, Facebook, and TikTok accounts |
| Comments and DMs | Read, summarize, reply to, and hide comments and messages |
| Support email | List and work open support email threads |
| Insights | Spot trending questions and complaints |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Replies to comments and messages post publicly on the connected social accounts.
- Tool calls run under the Brandwise permissions of the user who authorizes the connection.

## Docs

- Brandwise: https://brandwise.ai
- Server URL: https://mcp.brandwise.ai/api/mcp

Logo is Brandwise's owl mark from the `BrandwiseAI` GitHub organization avatar. The submitted logo URL on brandwise.ai could not be reached from the build environment when this plugin was added.

## License

MIT

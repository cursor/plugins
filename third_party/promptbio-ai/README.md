# PromptBio

Cursor plugin that connects agents to [PromptBio](https://promptbio.ai) through PromptBio's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

PromptBio is an agentic AI platform for the life sciences. It processes biological data and scales biomarker discovery workflows without code or infrastructure to manage.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **PromptBio**.
3. Click **Install**, then complete the PromptBio sign-in prompt.

Or run `/add-plugin promptbio-ai` in chat.

## MCP

```json
{
  "mcpServers": {
    "promptbio-ai": {
      "type": "http",
      "url": "https://platform.promptbio.ai/mcp"
    }
  }
}
```

## Before you connect

You need a PromptBio account. Sign up for a trial at https://platform.promptbio.ai.

## Try it

After connecting, ask: "List the sessions in the Tutorial project."

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- PromptBio: https://promptbio.ai
- Platform: https://platform.promptbio.ai
- Server URL: https://platform.promptbio.ai/mcp

Logo is the avatar of the `PromptBio` GitHub organization. promptbio.ai blocked automated requests when this plugin was added, so the submitted logo (https://promptbio.ai/img/logo-square.png) was not downloaded.

## License

MIT

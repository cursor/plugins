# Audiencelab

Cursor plugin that connects agents to [Audiencelab](https://audiencelab.ai) through Audiencelab's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Board apps, prepare ad creatives, fund a wallet, and launch paid user-acquisition campaigns. Audiencelab is built for solo developers and indie studios who want to acquire users through paid advertising without leaving the editor.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Audiencelab**.
3. Click **Install**. Complete the Audiencelab sign-in prompt when a tool asks for it.

Or run `/add-plugin audiencelab` in chat.

## MCP

```json
{
  "mcpServers": {
    "audiencelab": {
      "type": "http",
      "url": "https://mcp.audiencelab.ai/mcp"
    }
  }
}
```

You can create an unsigned provisional app without signing in. Tools past that point need Audiencelab OAuth.

## What agents can do

- Board an app with `chart_boarding` and `request_boarding`.
- Prepare creatives with `prepare_craft`, up to app store submission.
- Fund a wallet and launch campaigns.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Docs: https://docs.audiencelab.ai
- Privacy: https://audiencelab.ai/privacy
- Terms: https://audiencelab.ai/terms
- Support: support@geeklab.app
- Server URL: https://mcp.audiencelab.ai/mcp

The logo is the avatar of the publisher's `Geeklab-Ltd` GitHub organization (460×460 JPEG). The submitted logo URL (https://audiencelab.ai/brand/audiencelab-v1/app-512.png) could not be reached from the build environment when this plugin was added.

## License

MIT

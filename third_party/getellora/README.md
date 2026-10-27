# Ellora

Cursor plugin that connects agents to [Ellora](https://getellora.com) through Ellora's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Your editor in chief, for every AI draft. Ellora reviews each finished draft against a voice profile built from your team's own writing and sends it back until it passes.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Ellora**.
3. Click **Install**, then complete the Ellora sign-in prompt and pick your workspace.

Or run `/add-plugin getellora` in chat.

## MCP

```json
{
  "mcpServers": {
    "getellora": {
      "type": "http",
      "url": "https://api.getellora.com/v1/external/mcp"
    }
  }
}
```

Auth is OAuth with dynamic client registration and PKCE, so Cursor prompts for Ellora sign-in when the plugin connects. There is no API key to configure.

## Before you connect

You need an Ellora account. Sign up free at https://app.getellora.com/register.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Voice profiles | Create a voice profile from samples of your team's writing |
| Review | Check a draft against a voice profile and return findings with fixes |
| Revision loop | Revise and re-review until the draft passes |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Ellora: https://getellora.com
- Server URL: https://api.getellora.com/v1/external/mcp

Logo is Ellora's mark from `assets/logo.png` in the [`getellora/agent-skills`](https://github.com/getellora/agent-skills) repository. The submitted favicon (`https://getellora.com/favicon.svg`) could not be downloaded when this plugin was added.

## License

MIT

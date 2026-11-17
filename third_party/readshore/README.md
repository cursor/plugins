# ReadShore

Cursor plugin that connects agents to [ReadShore](https://readshore.app/) through ReadShore's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

ReadShore is a read-later app. Connect your ReadShore library to find the articles, videos and posts you saved, read their saved text alongside ReadShore's summary and analysis, see what has waited longest unread, and save new links to read later.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **ReadShore**.
3. Click **Install**, then sign in to ReadShore and choose Allow.

Or run `/add-plugin readshore` in chat.

In Grok Bot, open **Settings → Plugins**, install **ReadShore**, and complete the same sign-in.

## MCP

```json
{
  "mcpServers": {
    "readshore": {
      "type": "http",
      "url": "https://readshore.app/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth 2.1 authorization code with PKCE (S256) and dynamic client registration, so there is no API key or client ID to configure. Cursor or Grok Bot opens readshore.app/connect when the plugin connects; each reader signs in with the Apple or Google account that holds their library and chooses Allow.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## Before you connect

You need a ReadShore account. Create one in the iPhone app or in the web app at https://readshore.app/app/.

## What agents can do

| Area | Capabilities |
| --- | --- |
| Find | Search your saves by words, reading state and save order, including what has waited longest unread |
| Read | Read a save's text with ReadShore's summary and analysis, cited by numbered passages |
| Save | Save a link to read later |

The connection cannot delete a save or mark it as read. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Each connection reaches only the library of the reader who signed in.
- Disconnect at https://readshore.app/connect/ or in the app under Settings › Your agents.

## Docs

- Connection guide: https://readshore.app/connect-ai-assistants/?utm_source=cursor-plugin&utm_medium=mcp-package
- Server URL: https://readshore.app/mcp
- Privacy: https://readshore.app/privacy/
- Terms: https://readshore.app/terms/
- Support: https://readshore.app/support/
- Contact: steven@aithentic.tw

Logo is ReadShore's app icon.

## License

MIT

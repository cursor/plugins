# stella

Cursor plugin that connects agents to [stella](https://stll.app), a legal workspace, through stella's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search legal sources and work with your accessible matters, documents, templates, and contacts in stella.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **stella**.
3. Click **Install**, then complete the stella sign-in prompt.

Or run `/add-plugin stella` in chat.

## MCP

```json
{
  "mcpServers": {
    "stella": {
      "type": "http",
      "url": "https://api.stll.app/mcp"
    }
  }
}
```

Auth is OAuth. Cursor opens the stella sign-in page when the plugin connects.

## Before you connect

You need a stella account with access to an organization.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Legal sources | Search case law and legislation |
| Matters | Work with the matters your account can access |
| Documents and templates | Read and work with documents and templates |
| Contacts | Look up and manage contacts |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the stella permissions of the user who authorizes the connection. Write tools can change records and documents.

## Docs

- stella: https://stll.app
- Connection guide: https://stll.app/docs/get-started/connect-ai-assistant/
- Server URL: https://api.stll.app/mcp

Logo is the stella app icon from the [`stella/plugins`](https://github.com/stella/plugins) repository.

## License

MIT

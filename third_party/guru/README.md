# Guru

Cursor plugin that connects agents to [Guru](https://www.getguru.com) through Guru's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask questions against a company's Guru knowledge base and connected sources, get permission-aware answers with citations, and draft or update Guru Cards.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Guru**.
3. Click **Install**, then complete the Guru sign-in prompt.

Or run `/add-plugin guru` in chat.

## MCP

```json
{
  "mcpServers": {
    "guru": {
      "type": "http",
      "url": "https://mcp.api.getguru.com/mcp"
    }
  }
}
```

Auth is OAuth 2.0. Cursor prompts for Guru sign-in when the plugin connects.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | Search Guru Cards and connected Sources such as Salesforce, Slack, Google Drive, Confluence, and SharePoint |
| Verified answers | Generate answers through Knowledge Agents, with citations back to the source |
| Cards | Create and update Guru Cards |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Guru user who authorizes the connection and respect that user's content permissions.
- Guru also accepts an API token, but in an unusual composite form: `Authorization: Bearer [EMAIL]:[TOKEN]`, where the email is the Guru account email and the token comes from **Admin → API Tokens**.
- Guru only supports HTTP streaming, not server-sent events.
- All queries are logged in Guru's AI Agent Center.

## Docs

- Guru MCP server overview: https://developer.getguru.com/docs/guru-mcp-server-overview
- Authentication and connection setup: https://developer.getguru.com/docs/authentication-connection-setup
- Connecting Guru's MCP server: https://help.getguru.com/docs/connecting-gurus-mcp-server
- Server URL: https://mcp.api.getguru.com/mcp

Logo is Guru's official mark, from the `guruhq` GitHub organization.

## License

MIT

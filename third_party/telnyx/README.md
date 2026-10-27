# Telnyx

Cursor plugin that connects agents to [Telnyx](https://telnyx.com) through Telnyx's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search Telnyx API documentation and manage communications services. Find endpoints and request schemas without signing in, or sign in with Telnyx to work with AI Assistants, voice calls, messaging, phone numbers, and account information.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Telnyx**.
3. Click **Install**. Complete the Telnyx sign-in prompt when a tool needs your account.

Or run `/add-plugin telnyx` in chat.

## MCP

```json
{
  "mcpServers": {
    "telnyx": {
      "type": "http",
      "url": "https://api.telnyx.com/v2/ai/mcp"
    }
  }
}
```

The server uses Streamable HTTP. API documentation tools such as `list_api_endpoints` and `get_api_endpoint_schema` work without signing in. Account tools use Telnyx OAuth, so Cursor prompts for Telnyx sign-in — there is no API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| API docs | List Telnyx API endpoints and read request schemas |
| AI Assistants | List and work with your Telnyx AI Assistants |
| Voice | Work with voice calls |
| Messaging | Work with SMS and messaging |
| Phone numbers | Look up and manage phone numbers |
| Account | Read account information |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Telnyx permissions of the user who signs in.
- Some tools send messages, place calls, or change resources, and those actions can incur charges on your Telnyx account.

## Docs

- Telnyx: https://telnyx.com
- Server URL: https://api.telnyx.com/v2/ai/mcp

The logo is the Telnyx GitHub organization avatar (460×460 PNG).

## License

MIT

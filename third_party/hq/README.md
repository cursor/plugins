# HQ

Cursor plugin that connects agents to [HQ](https://hqforwork.com) through HQ's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Bring your company's knowledge, projects, Skills, and connected systems such as CRM, analytics, and email into the agent, within what your HQ account is allowed to use. HQ is made by Indigo, which hosts the server on `getindigo.ai`.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HQ**.
3. Click **Install**, then complete the HQ sign-in prompt.

Or run `/add-plugin hq` in chat.

## MCP

```json
{
  "mcpServers": {
    "hq": {
      "type": "http",
      "url": "https://hq-mcp.getindigo.ai/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. The authorization server is `https://hq-mcp.getindigo.ai`, it supports dynamic client registration, and it requests the `openid`, `email`, `profile`, and `hq-mcp/use` scopes. The client prompts for HQ sign-in when the plugin connects. There is no client ID or key to configure.

## Before you connect

You need an HQ account. The agent reaches only the company memory, Skills, tools, and systems you are allowed to use in HQ.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Knowledge | Company memory and documents in HQ |
| Projects | Project context and status |
| Skills | Run the HQ Skills your team has set up |
| Connected systems | CRM, analytics, email, and other systems connected to HQ |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- HQ MCP: https://hqforwork.com/products/mcp
- Server URL: https://hq-mcp.getindigo.ai/mcp

Logo is HQ's official app icon from hqforwork.com.

## License

MIT

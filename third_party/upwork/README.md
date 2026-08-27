# Upwork

Cursor plugin that connects agents to [Upwork](https://www.upwork.com) through Upwork's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and shortlist talent, post and edit jobs, handle invitations and proposals, and manage active contracts in the signed-in Upwork account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Upwork**.
3. Click **Install**, then complete the Upwork sign-in prompt.

Or run `/add-plugin upwork` in chat.

## MCP

```json
{
  "mcpServers": {
    "upwork": {
      "type": "http",
      "url": "https://mcp.upwork.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with Dynamic Client Registration. Cursor registers itself and prompts for Upwork sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

An Upwork account is all you need — there is no plan tier, partner program, or waitlist. The tool surface differs depending on whether you sign in as a client or as a freelancer.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Find talent (client) | Search and shortlist freelancers, and manage talent lists |
| Jobs (client) | Post, edit, and manage job listings |
| Invitations & proposals | Send invitations, and review or respond to proposals |
| Find work (freelancer) | Search jobs, and draft and submit proposals |
| Contracts | Manage active contracts and work delivery |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Upwork user who authorizes the connection.
- Financial actions deliberately do not complete over MCP. Funding escrow, accepting an offer, and paying a milestone all finish on upwork.com.
- Several community `upwork-mcp` projects exist on GitHub and npm; none are published by Upwork. This plugin uses Upwork's own hosted server.

## Docs

- Upwork MCP Server: https://www.upwork.com/ai/mcp
- Server URL: https://mcp.upwork.com/mcp

Logo is Upwork's official mark, from the `upwork` GitHub organization.

## License

MIT

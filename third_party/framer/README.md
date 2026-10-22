# Framer

Cursor plugin that connects agents to [Framer](https://www.framer.com) through Framer's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Give the agent a Framer project URL and ask for what you want, such as a new section on a page, a layout or copy change, or an update to your CMS content.

Framer's own plugin repository: https://github.com/framer/agent-plugins

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Framer**.
3. Click **Install**, then complete the Framer sign-in prompt.

Or run `/add-plugin framer` in chat.

## MCP

```json
{
  "mcpServers": {
    "framer": {
      "type": "http",
      "url": "https://mcp.framer.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is MCP OAuth (Bearer). Cursor discovers the authorization server when the plugin connects and prompts for Framer login. Framer supports Dynamic Client Registration with PKCE, so there is no API token, client ID, client secret, or custom header to configure.

## Before you connect

You need a Framer account with access to the projects you want the agent to work on. Unauthenticated requests to the server are rejected until that login completes.

## Notes

- Tool calls run as the Framer user who authorizes the connection and cannot exceed that user's permissions.
- The agent can change and publish your sites. Review changes in the Framer editor before publishing.
- What the agent reads from or changes in your projects goes through Framer's servers, under the [Framer Privacy Statement](https://www.framer.com/legal/privacy-statement/).
- OAuth metadata is discovered at connect time (protected resource `https://mcp.framer.com/.well-known/oauth-protected-resource/mcp`, authorization server `https://api.framer.com/auth/oauth`, scope `mcp:project`).
- Framer's client registration accepts `http://localhost` and `https` return addresses only. `"placement": "server"` makes Grok Bot connect through Cursor's hosted `https` callback.
- The hosted runtime is the source of truth for tool names and schemas; tools are listed after sign-in.

## Docs

- Framer: https://www.framer.com
- Framer agent plugins: https://github.com/framer/agent-plugins
- Server URL: https://mcp.framer.com/mcp

Logo is Framer's official black logo mark, from `https://misc.framerstatic.com/logo-black.svg` (Framer B.V.).

## License

MIT

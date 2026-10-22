# Vanta

Cursor plugin that connects agents to [Vanta](https://www.vanta.com) through Vanta's official remote [Model Context Protocol](https://modelcontextprotocol.io/) servers.

Ask about your compliance posture, such as which tests are failing, which controls map to a framework, or which vulnerabilities are past their SLA, and have the agent help remediate failing tests.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Vanta**.
3. Click **Install**.
4. Connect only the server for your Vanta region (`vanta-us`, `vanta-eu`, or `vanta-aus`), then complete the Vanta sign-in prompt and click **Allow**.

Or run `/add-plugin vanta` in chat.

## MCP

Vanta hosts a separate MCP server per region, so the plugin ships one server for each:

```json
{
  "mcpServers": {
    "vanta-us": {
      "type": "http",
      "url": "https://mcp.vanta.com/mcp",
      "placement": "server"
    },
    "vanta-eu": {
      "type": "http",
      "url": "https://mcp.eu.vanta.com/mcp",
      "placement": "server"
    },
    "vanta-aus": {
      "type": "http",
      "url": "https://mcp.aus.vanta.com/mcp",
      "placement": "server"
    }
  }
}
```

| Server | Vanta region | URL |
|:-------|:-------------|:----|
| `vanta-us` | United States | `https://mcp.vanta.com/mcp` |
| `vanta-eu` | Europe | `https://mcp.eu.vanta.com/mcp` |
| `vanta-aus` | Australia | `https://mcp.aus.vanta.com/mcp` |

Auth is MCP OAuth (Bearer). Cursor discovers the authorization server when a server connects and prompts for Vanta login. Vanta supports Dynamic Client Registration with PKCE, so there is no API token, client ID, client secret, or custom header to configure. The servers for the regions you don't use stay unauthenticated and can be ignored.

## Before you connect

You need an active Vanta user. Any role can connect, including Editor, Collaborator, and View-only Admin. Unauthenticated requests to a server are rejected until that login completes.

## Notes

- Tool calls run as the Vanta user who authorizes the connection and cannot exceed that user's permissions. Admins get the full tool set; other roles get the same tools minus a few that Vanta restricts to Admins.
- The agent can change your compliance data, such as creating risks or uploading policies. Review changes in Vanta.
- What the agent reads from or changes in your account goes through Vanta's servers, under the [Vanta Privacy Policy](https://www.vanta.com/legal/privacy).
- OAuth metadata is discovered at connect time. Each server publishes it at `/.well-known/oauth-protected-resource` with scope `mcp-api.all:write`.
- If a connection stops working, remove and re-add it to start a fresh OAuth flow.
- The hosted runtime is the source of truth for tool names and schemas; tools are listed after sign-in.

## Docs

- Vanta MCP server: https://developer.vanta.com/docs/vanta-mcp
- Connecting to Vanta MCP: https://help.vanta.com/en/articles/14094979-connecting-to-vanta-mcp
- Vanta's Claude Code plugin, which uses the same three servers: https://github.com/VantaInc/vanta-mcp-plugin

Logo is the "V" glyph from Vanta's official wordmark, from `https://cdn.prod.website-files.com/64009032676f24f376f002fc/6400ac82429afb0f7b31fa6c_vanta-logo.svg` (Vanta Inc.).

## License

MIT

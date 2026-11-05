# Vanta

Cursor plugin that connects agents to [Vanta](https://www.vanta.com) through Vanta's official remote [Model Context Protocol](https://modelcontextprotocol.io/) servers.

Ask about your compliance posture, such as which tests are failing, which controls map to a framework, or which vulnerabilities are past their SLA, and have the agent help remediate failing tests.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Vanta**.
3. Click **Install**, choose your Vanta region, then complete the Vanta sign-in prompt and click **Allow**.

Or run `/add-plugin vanta` in chat.

In Grok Bot, the region is asked when you sign in, the same way Zoho asks for its data center. In Cursor, the region is the plugin's **Vanta region** setup value.

## MCP

Vanta hosts a separate MCP server per region. The plugin ships one server whose host is the region you choose:

```json
{
  "mcpServers": {
    "vanta": {
      "type": "http",
      "url": "https://${VANTA_MCP_HOST}/mcp",
      "placement": "server"
    }
  }
}
```

| Vanta region | `VANTA_MCP_HOST` | URL |
|:-------------|:-----------------|:----|
| United States | `mcp.vanta.com` | `https://mcp.vanta.com/mcp` |
| Europe | `mcp.eu.vanta.com` | `https://mcp.eu.vanta.com/mcp` |
| Australia | `mcp.aus.vanta.com` | `https://mcp.aus.vanta.com/mcp` |

`VANTA_MCP_HOST` is declared in `plugin.json` as an enum of those three hosts, so no other host can be stored. Grok Bot's region picker lists the same three regions; keep the two in sync if Vanta adds one.

Auth is MCP OAuth (Bearer). Cursor discovers the authorization server when the server connects and prompts for Vanta login. Vanta supports Dynamic Client Registration with PKCE, so there is no API token, client ID, client secret, or custom header to configure.

## Before you connect

You need an active Vanta user. Any role can connect, including Editor, Collaborator, and View-only Admin. Unauthenticated requests to the server are rejected until that login completes.

## Notes

- Tool calls run as the Vanta user who authorizes the connection and cannot exceed that user's permissions. Admins get the full tool set; other roles get the same tools minus a few that Vanta restricts to Admins.
- The agent can change your compliance data, such as creating risks or uploading policies. Review changes in Vanta.
- What the agent reads from or changes in your account goes through Vanta's servers, under the [Vanta Privacy Policy](https://www.vanta.com/legal/privacy).
- OAuth metadata is discovered at connect time. Each regional server publishes it at `/.well-known/oauth-protected-resource` with scope `mcp-api.all:write`.
- Switching regions needs a new sign-in: each region keeps its own sign-in.
- If a connection stops working, remove and re-add it to start a fresh OAuth flow.
- The hosted runtime is the source of truth for tool names and schemas; tools are listed after sign-in.

## Docs

- Vanta MCP server: https://developer.vanta.com/docs/vanta-mcp
- Connecting to Vanta MCP: https://help.vanta.com/en/articles/14094979-connecting-to-vanta-mcp

Logo is the "V" glyph from Vanta's official wordmark, from `https://cdn.prod.website-files.com/64009032676f24f376f002fc/6400ac82429afb0f7b31fa6c_vanta-logo.svg` (Vanta Inc.).

## License

MIT

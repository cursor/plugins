# ServiceNow

Cursor plugin that connects agents to a [ServiceNow](https://www.servicenow.com) instance through the instance's own [Model Context Protocol](https://modelcontextprotocol.io/) server, created in [MCP Server Console](https://www.servicenow.com/docs/r/australia/intelligent-experiences/exploring-mcp-server-console.html).

Agents call the tools an AI administrator publishes on that server. The preconfigured Quickstart Server can look up and summarize incidents and cases when those applications are installed. A custom server exposes whatever tools that admin adds.

## Install

1. An AI administrator activates a server in MCP Server Console and creates an OAuth inbound integration (see [Instance setup](#instance-setup)).
2. A Cursor team admin opens **Cursor Settings → Plugins**, searches for **ServiceNow**, installs it, and enters the instance hostname, server name, client ID, and client secret.
3. Each member signs in to ServiceNow when Cursor prompts them.

Or run `/add-plugin servicenow` in chat.

## MCP

The plugin points at the Server URL shown on the server record:

```json
{
  "mcpServers": {
    "servicenow": {
      "type": "http",
      "url": "https://${SERVICENOW_HOST}/sncapps/mcp-server/mcp/${SERVICENOW_MCP_SERVER}",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}",
        "scopes": ["mcp_server"]
      }
    }
  }
}
```

ServiceNow documents that URL as `https://<instance>.service-now.com/sncapps/mcp-server/mcp/<server-name>`. The Quickstart Server's name is `sn_mcp_server_default`.

Auth is OAuth 2.0 authorization code with a client secret. Cursor requests the `mcp_server` scope. ServiceNow's authorization endpoint is `https://<instance>/oauth_auth.do` and its token endpoint is `https://<instance>/oauth_token.do`.

## Instance setup

MCP Server Console only supports remote, stateless servers over Streamable HTTP. An administrator does this once per instance.

### 1. Activate a server and copy its name

In the instance, go to **All → MCP Server Console**, open **Configuration → Servers**, and either activate the Quickstart Server or create a server and add tools. The server has to be **Active**.

The record's **Server URL** looks like:

`https://acme.service-now.com/sncapps/mcp-server/mcp/sn_mcp_server_default`

| Plugin field | Value |
| --- | --- |
| `SERVICENOW_HOST` | Bare hostname, for example `acme.service-now.com`. Leave out `https://` and the path. |
| `SERVICENOW_MCP_SERVER` | The last path segment. Quickstart is `sn_mcp_server_default`. |

Creating a server requires the `sn_mcp_server.admin` or `admin` role. The server and its tools have to share an application scope.

### 2. Create an OAuth inbound integration

ServiceNow does not support dynamic client registration for this server. Create one inbound integration for Cursor.

1. In **MCP Server Console → Configuration → Servers**, use **Set up OAuth** on the banner, or go to **All → Machine Identity Console → Inbound integrations**.
2. Select **New integration → OAuth - Authorization code grant**.
3. Add every callback URL Cursor uses:

   | Surface | Callback URL |
   |:--------|:-------------|
   | Desktop | `http://localhost:8787/callback` |
   | Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |
   | Older desktop builds | `cursor://anysphere.cursor-mcp/oauth/callback` |

4. Leave **Allow access only to APIs in selected scope** cleared. With that box selected, the client can authenticate and still receive no tools.
5. If ServiceNow asks to assign an auth scope, choose **Skip for now**.
6. Under advanced options, set **Token Format** to **JWT**.
7. Save, then copy the **Client ID** and **Client secret**.

Skip inbound integrations whose names match a server name, including underscores. Those belong to AI Control Tower monitoring.

Creating the integration requires `oauth_admin`, `mi_admin`, or `admin`.

### 3. Enter the connection in Cursor

In **Dashboard → Plugins → Configure**, set:

| Field | Value |
| --- | --- |
| `SERVICENOW_HOST` | Instance hostname. |
| `SERVICENOW_MCP_SERVER` | Server name from the Server URL. |
| `CLIENT_ID` | Client ID from the inbound integration. |
| `CLIENT_SECRET` | Client secret from the same integration. Stored encrypted and never shown back. |

Each member then signs in with their own ServiceNow user. Tool calls run as that user. The connecting user needs the `sn_mcp_server.viewer` role, plus whatever ACLs the published tools require.

## Troubleshooting

| Symptom | What to check |
|:--------|:--------------|
| Sign-in succeeds and no tools appear | **Allow access only to APIs in selected scope** is selected, or the server is still a draft. |
| `401` | Sign in again so Cursor gets a new token. The integration's token format has to be **JWT**. |
| `403` | The signed-in user is missing `sn_mcp_server.viewer` or the ACL on that tool. |
| Empty result with no error | The tool's ACL is hiding the records. |
| Payload too big | ServiceNow rejects MCP request payloads over 26 KB and response payloads over 64 KB. |

## Docs

- Exploring MCP Server Console: https://www.servicenow.com/docs/r/australia/intelligent-experiences/exploring-mcp-server-console.html
- Create a server: https://www.servicenow.com/docs/r/australia/intelligent-experiences/create-mcp-server.html
- OAuth inbound integration: https://www.servicenow.com/docs/r/australia/intelligent-experiences/create-oauth-inbound-integration-mcp-client.html
- Configure a client: https://www.servicenow.com/docs/r/australia/intelligent-experiences/configure-client-connect-server.html

## License

MIT

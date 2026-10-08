# Salesforce

Cursor plugin that connects agents to [Salesforce](https://www.salesforce.com) through [Salesforce Hosted MCP](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/), Salesforce's first-party [Model Context Protocol](https://modelcontextprotocol.io/) service.

Query, create, and update records, and with the Headless 360 server, run admin and developer tasks such as managing users and permission sets, all under the signed-in user's own permissions and field-level security.

## Who does what

| Role | What they do |
|:-----|:-------------|
| **Salesforce admin** | Creates the External Client App, activates an MCP server, and enters the **server URL** and **Consumer Key** once in the team's plugin settings. |
| **Everyone else on the team** | Installs the plugin and signs in to Salesforce. Members don't need the Consumer Key and can't get it from their own Salesforce accounts. |

Each member signs in individually, so tools run with that member's own object, field, and sharing permissions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Salesforce**.
3. Click **Install**. If your admin has configured the plugin for your team, complete the Salesforce sign-in prompt. If you're asked for a server URL and Consumer Key, ask your Salesforce admin to configure the plugin for the team first.

Or run `/add-plugin salesforce` in chat.

## MCP

```json
{
  "mcpServers": {
    "salesforce": {
      "type": "http",
      "url": "${SALESFORCE_MCP_URL}",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "scopes": ["mcp_api", "refresh_token"]
      }
    }
  }
}
```

## Admin setup

Salesforce Hosted MCP requires an **External Client App** in your org. Connected Apps are not supported.

### 1. Create the External Client App

From Setup, go to **External Client App Manager → New External Client App**, fill in the basics, then expand **API (Enable OAuth Settings)** and check **Enable OAuth**.

Add every callback URL you need. Cursor uses different ones per surface:

| Surface | Callback URL |
|:--------|:-------------|
| Desktop | `http://localhost:8787/callback` |
| Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |
| Older desktop builds | `cursor://anysphere.cursor-mcp/oauth/callback` |

Under **OAuth Scopes**, select exactly these two and nothing broader:

- **Access Salesforce hosted MCP servers** (`mcp_api`)
- **Perform requests at any time** (`refresh_token`, `offline_access`)

The second one is easy to miss because the picker labels scopes by description rather than by value. Without it the plugin cannot refresh, and every user has to re-authenticate when their access token expires. Do not add **Full access** (`full`). Hosted MCP does not need it.

Under **Security**, select **Issue JSON Web Token (JWT)-based access tokens for named users**. This is required: without it Salesforce issues opaque tokens and every tool call fails with `JWT Token is required`. Turn off **Require Secret for Web Server Flow**. Cursor authenticates as a public client using PKCE, so no client secret is involved. Do not enable the **JWT Bearer Flow**, which is a different feature and needs a certificate.

Finally, copy the **Consumer Key** from **Settings → Consumer Key and Secret**.

A new External Client App can take up to 30 minutes to propagate. Until it does, authentication fails with `invalid_client_id`; wait rather than recreating the app.

### 2. Activate a server and copy its URL

In Setup, open **MCP Servers**, activate the server you want, and copy its **Server URL**. The URL encodes both the org type and the server.

**Headless 360 (Beta) is recommended.** It gives agents access across Salesforce through four tools (`discover`, `describe`, `dispatch`, and `dispatch_readonly`) backed by a growing library of Salesforce operations. It needs API version 67.0 or later, and you must activate it: **Setup → MCP Servers → headless-360 → Activate**.

| Org type | Headless 360 (recommended) |
|:---------|:---------------------------|
| Production, Developer, Enterprise | `https://api.salesforce.com/platform/mcp/v1/platform/headless-360` |
| Sandbox or scratch | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/headless-360` |

The SObject servers and custom servers are still supported. Use them when you want a narrower tool surface:

| Org type | SObject server | Custom server |
|:---------|:---------------|:--------------|
| Production, Developer, Enterprise | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-all` | `https://api.salesforce.com/platform/mcp/v1/custom/myserver` |
| Sandbox or scratch | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-all` | `https://api.salesforce.com/platform/mcp/v1/sandbox/custom/myserver` |

The SObject servers have different blast radii: `sobject-reads` for read-only access, `sobject-mutations` for reads plus create and update, `sobject-deletes`, and `sobject-all` for everything.

### 3. Configure the plugin for your team

In **Dashboard → Plugins → Configure**, set **Salesforce MCP server URL** and **Salesforce Consumer Key** on your team marketplace. Members then skip setup and go straight to the Salesforce sign-in.

### Switching an existing setup to Headless 360

Activate Headless 360 in Setup, then replace the server URL in the plugin settings. The External Client App, Consumer Key, and scopes stay the same. Members may be asked to sign in to Salesforce again after the URL changes, and their agent then sees the four Headless 360 tools in place of the SObject tools.

## Approvals for changes

`dispatch` can change org configuration or data, for example creating or deactivating users, assigning permission sets, or deploying Apex. Configure your client to ask for approval before it runs `dispatch`, and let `dispatch_readonly` run without approval. Try configuration changes in a sandbox or Developer org before production.

## Troubleshooting

| Symptom | Cause |
|:--------|:------|
| A member is asked for a server URL and Consumer Key | Your Salesforce admin has not configured the plugin for the team yet. |
| `invalid_client_id` | The External Client App has not finished propagating. Wait up to 30 minutes. |
| `invalid_scope` | The app is missing **Access Salesforce hosted MCP servers** or **Perform requests at any time**. |
| `JWT Token is required` or `Invalid token` after a successful login | **Issue JSON Web Token (JWT)-based access tokens for named users** is not enabled. |
| Auth succeeds but the server 404s | The MCP server (for example Headless 360) is not activated in Setup, or the URL's org type does not match the org you logged into. |

## Docs

- Headless 360 MCP server: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/headless-360-mcp.html
- Configure Cursor: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/cursor.html
- Create an External Client App: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/create-external-client-app.html
- SObject servers: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/sobject-all.html

## License

MIT

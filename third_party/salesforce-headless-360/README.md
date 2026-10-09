# Salesforce (Headless 360, Beta)

Cursor plugin that connects agents to Salesforce's [Headless 360 MCP server](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/headless-360-mcp.html) (Beta), part of [Salesforce Hosted MCP](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/).

Headless 360 gives agents access across Salesforce through four tools backed by a growing library of Salesforce operations. Agents can query, create, and update records; manage users, permission sets, and permission set licenses; work with Apex triggers, platform events, and Change Data Capture; set up named credentials; and manage Commerce Cloud orders. Every call runs as the signed-in user, with that user's object permissions, field-level security, and sharing rules.

This plugin is separate from the [`salesforce`](../salesforce/) plugin, which connects to the SObject and custom Hosted MCP servers. Both can be installed at the same time.

## Who does what

| Role | What they do |
|:-----|:-------------|
| **Salesforce admin** | Creates the External Client App, activates Headless 360, and enters the **server URL**, **Consumer Key**, and **Consumer Secret** once in the team's plugin settings. |
| **Everyone else on the team** | Installs the plugin and signs in to Salesforce. Members don't need the Consumer Key or Secret and can't get them from their own Salesforce accounts. |

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Salesforce (Headless 360, Beta)**.
3. Click **Install**. If your admin has configured the plugin for your team, complete the Salesforce sign-in prompt. If you're asked for a server URL, Consumer Key, and Consumer Secret, ask your Salesforce admin to configure the plugin for the team first.

## Tools

| Tool | What it does |
|:-----|:-------------|
| `discover` | Finds Salesforce operations that match a request. |
| `describe` | Returns an operation's parameters, dependencies, and steps. |
| `dispatch` | Runs an operation. It can change data and org configuration. |
| `dispatch_readonly` | Runs read-only operations. It never changes data or configuration. |

## MCP

```json
{
  "mcpServers": {
    "salesforce-headless-360": {
      "type": "http",
      "url": "${SALESFORCE_MCP_URL}",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}",
        "scopes": ["mcp_api", "refresh_token"]
      }
    }
  }
}
```

## Admin setup

### 1. Activate Headless 360

Headless 360 needs API version 67.0 or later. From Setup, enter **MCP Servers** in Quick Find, select **MCP Servers**, find **headless-360**, and click **Activate**.

### 2. Create the External Client App

From Setup, go to **External Client App Manager → New External Client App**, fill in the basics, then expand **API (Enable OAuth Settings)** and check **Enable OAuth**. Connected Apps are not supported.

Add every callback URL Cursor and Grok Bot use:

| Surface | Callback URL |
|:--------|:-------------|
| Cursor desktop | `http://localhost:8787/callback` |
| Cursor desktop (IPv4 loopback) | `http://127.0.0.1:8787/callback` |
| Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |
| Older Cursor desktop builds | `cursor://anysphere.cursor-mcp/oauth/callback` |
| Grok Bot | `grokbot://mcp/oauth/callback` |
| Grok Bot (browser handoff) | `https://www.cursor.com/bot/mcp/oauth/callback` |

Under **OAuth Scopes**, select exactly these two and nothing broader:

- **Access Salesforce hosted MCP servers** (`mcp_api`)
- **Perform requests at any time** (`refresh_token`, `offline_access`)

The second one is easy to miss because the picker labels scopes by description rather than by value. Without it, members have to sign in again every time their access token expires. Do not add **Full access** (`full`).

Under **Security**:

- Select **Issue JSON Web Token (JWT)-based access tokens for named users**. Without it, Salesforce issues opaque tokens and every tool call fails with `JWT Token is required`.
- Keep **Require Proof Key for Code Exchange (PKCE)** and **Require Secret for Web Server Flow** on.
- Do not enable the **JWT Bearer Flow**, which is a different feature and needs a certificate.

Copy the **Consumer Key** and **Consumer Secret** from **Settings → Consumer Key and Secret**.

A new External Client App can take up to 30 minutes to propagate. Until it does, sign-in fails with `invalid_client_id`; wait rather than recreating the app.

### 3. Configure the plugin for your team

In **Dashboard → Plugins → Configure**, set these on your team marketplace:

| Setting | Value |
|:--------|:------|
| **Salesforce MCP server URL** | `https://api.salesforce.com/platform/mcp/v1/platform/headless-360` for production and Developer orgs, or `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/headless-360` for sandbox and scratch orgs. |
| **Salesforce Consumer Key** | The Consumer Key from step 2. |
| **Salesforce Consumer Secret** | The Consumer Secret from step 2. |

Members then skip setup and go straight to the Salesforce sign-in. The secret is masked in the settings UI. Cursor still delivers it to each member's client, because desktop clients run the sign-in themselves.

## Approvals for changes

`dispatch` can change org configuration or data, for example creating or deactivating users, assigning permission sets, or deploying Apex. Configure your client to ask for approval before it runs `dispatch`, and let `dispatch_readonly` run without approval. Try configuration changes in a sandbox or Developer org before production.

## Troubleshooting

| Symptom | Cause |
|:--------|:------|
| A member is asked for a server URL, Consumer Key, and Consumer Secret | Your Salesforce admin has not configured the plugin for the team yet. |
| `invalid_client_id` | The External Client App has not finished propagating. Wait up to 30 minutes. |
| `invalid_client` or `invalid client credentials` | The Consumer Secret doesn't match the Consumer Key. Copy both again from the same app. |
| `redirect_uri_mismatch` | The app is missing the callback URL for the surface you signed in from. Add all callback URLs above. |
| `invalid_scope` | The app is missing **Access Salesforce hosted MCP servers** or **Perform requests at any time**. |
| `JWT Token is required` or `Invalid token` after a successful login | **Issue JSON Web Token (JWT)-based access tokens for named users** is not enabled. |
| Sign-in succeeds but the server 404s | Headless 360 is not activated in Setup, or the URL's org type (production or sandbox) doesn't match the org you signed in to. |

## Docs

- Headless 360 MCP server: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/headless-360-mcp.html
- Create an External Client App: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/create-external-client-app.html
- Configure Cursor: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/cursor.html

## License

MIT

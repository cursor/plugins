# Google Ads

Cursor plugin that connects agents to the [Google Ads API](https://developers.google.com/google-ads/api) through Google's official [Google Ads MCP server](https://github.com/googleads/google-ads-mcp), run locally by Cursor.

List the customer accounts you can access, run [GAQL](https://developers.google.com/google-ads/api/docs/query/overview) reports over campaigns, ad groups, keywords, and metrics, and inspect the API's resource metadata. The official server is read-only: it can query and report, but it does not create or change campaigns, bids, or budgets.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Google Ads**.
3. Click **Install**, then set the developer token, credentials path, and project ID (see [Before you connect](#before-you-connect)).

Or run `/add-plugin google-ads` in chat.

## MCP

```json
{
  "mcpServers": {
    "google-ads": {
      "type": "stdio",
      "command": "pipx",
      "args": [
        "run",
        "--spec",
        "git+https://github.com/googleads/google-ads-mcp.git",
        "google-ads-mcp"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GOOGLE_APPLICATION_CREDENTIALS}",
        "GOOGLE_PROJECT_ID": "${GOOGLE_PROJECT_ID}",
        "GOOGLE_ADS_DEVELOPER_TOKEN": "${GOOGLE_ADS_DEVELOPER_TOKEN}"
      }
    }
  }
}
```

This is the same `pipx run` configuration that Google documents in the [developer integration guide](https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server). Google does not publish a hosted MCP endpoint for Google Ads, so the server runs on your machine over stdio.

## This is not a Google Workspace sign-in

The [Gmail](../gmail/), [Google Drive](../google-drive/), and [Google Calendar](../google-calendar/) plugins point at Google-hosted MCP endpoints, and Cursor prompts for a Google sign-in when they connect. Google Ads works differently, and a Workspace sign-in from those plugins does not carry over:

- **You need a Google Ads API developer token.** Every request carries a developer token issued through the API Center of a Google Ads manager account. Tokens start with test-account-only access; querying production accounts needs at least [Explorer access](https://developers.google.com/google-ads/api/docs/get-started/dev-token#access-levels).
- **You need Ads-specific OAuth scopes.** The Google Ads API requires the `https://www.googleapis.com/auth/adwords` scope. Workspace tokens do not include it, so you authorize separately with your own OAuth client, in a Google Cloud project where the Google Ads API is enabled.
- **Credentials live on your machine.** The server reads [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) from the file you point `GOOGLE_APPLICATION_CREDENTIALS` at. There is no browser sign-in inside Cursor for this plugin.

If you prefer a browser sign-in, the official server also supports a FastMCP OAuth proxy when you [self-host it on Cloud Run](https://github.com/googleads/google-ads-mcp#deployment-to-google-cloud-platform) with your own OAuth client ID and secret. Point the plugin's `mcp.json` at that deployment instead:

```json
{
  "mcpServers": {
    "google-ads": {
      "type": "http",
      "url": "https://YOUR-CLOUD-RUN-URL.a.run.app/mcp"
    }
  }
}
```

## Before you connect

1. **Install [pipx](https://pipx.pypa.io/stable/#install-pipx).** Cursor launches the server with `pipx run`, which downloads it from GitHub on first use. Python 3.10 or newer is required.
2. **Get a developer token.** Follow [Obtaining a developer token](https://developers.google.com/google-ads/api/docs/get-started/dev-token). If you see *"The developer token is only approved for use with test accounts"*, request a higher [access level](https://developers.google.com/google-ads/api/docs/access-levels) in the API Center.
3. **Enable the Google Ads API** in a Google Cloud project: [Google Ads API library page](https://console.cloud.google.com/apis/library/googleads.googleapis.com).
4. **Create an OAuth client** (Desktop or Web) in that project and download its client JSON. See [Manage OAuth clients](https://support.google.com/cloud/answer/15549257).
5. **Sign in with the Ads scope** as a user who can access your Google Ads accounts:

   ```shell
   gcloud auth application-default login \
     --scopes https://www.googleapis.com/auth/adwords,https://www.googleapis.com/auth/cloud-platform \
     --client-id-file=YOUR_CLIENT_JSON_FILE
   ```

   Copy the path printed as `Credentials saved to file: [...]`.
6. **Configure the plugin** in **Dashboard → Plugins → Configure**: the developer token, the credentials path from step 5, and the project ID from step 3.

### Manager accounts

If you reach the customer accounts through a manager (MCC) account, the server also needs the manager's customer ID. Add it to the server's `env`:

```json
"GOOGLE_ADS_LOGIN_CUSTOMER_ID": "1234567890"
```

See [login customer ID](https://developers.google.com/google-ads/api/docs/concepts/call-structure#cid) for details.

## What agents can do

| Tool | What it does |
| --- | --- |
| `list_accessible_customers` | Customer IDs directly accessible to the signed-in user |
| `search` | Run a GAQL query against a customer account: campaigns, ad groups, ads, keywords, metrics, segments |
| `get_resource_metadata` | Fields and structure of a Google Ads API resource type, such as `campaign` |

| Resource | What it provides |
| --- | --- |
| `discovery-document` | Discovery document for the latest Google Ads API version |
| `metrics` | Metrics available for reporting |
| `segments` | Segments available for reporting |
| `release-notes` | Release notes for the latest API version |

Most prompts need a customer ID; including it in the prompt (`How many active campaigns for customer id 1234567890?`) saves a round trip. Individual tools and namespaces can be enabled, disabled, or prefixed with a `tools_config.yaml` — see the [server README](https://github.com/googleads/google-ads-mcp#configuring-and-namespacing-tools).

## Notes

- This is a local stdio server, so `pipx` and Python 3.10+ have to be available on the machine running Cursor.
- The server exposes your Google Ads data to the agent you connect it to, and adds a usage header to its API calls that Google uses to improve the product.
- Requests run as the user who signed in with `gcloud` and are subject to that user's Google Ads access and the developer token's access level.
- Credentials and tokens are yours: this plugin ships no client ID, client secret, or developer token.

## Docs

- Google Ads MCP server: https://github.com/googleads/google-ads-mcp
- Developer integration guide: https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server
- Developer token: https://developers.google.com/google-ads/api/docs/get-started/dev-token
- Access levels: https://developers.google.com/google-ads/api/docs/access-levels
- GAQL: https://developers.google.com/google-ads/api/docs/query/overview

Logo is the official Google Ads product icon, placed on a white tile with padding so it reads well in the Cursor UI:
https://www.gstatic.com/images/branding/productlogos/ads/v5/192px.svg

## License

MIT

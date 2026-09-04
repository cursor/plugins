# Microsoft Advertising

Cursor plugin that connects agents to [Microsoft Advertising](https://about.ads.microsoft.com/en/solutions/technology/mcp-server) (formerly Bing Ads) through Microsoft's official hosted [Model Context Protocol](https://modelcontextprotocol.io/) server at `https://partner.api.bingads.microsoft.com/ext/mcp/vnext`.

This plugin signs you in with Microsoft Entra ID (Azure AD) OAuth as your own Microsoft Advertising user and works with the advertiser accounts you can access. Agents can explore accounts, campaigns, ad groups, ads, keywords, asset groups, and audience associations, and pull performance metrics (spend, clicks, impressions, CTR, CPC, conversions, ROAS, and more) over a date range.

The server is in open beta and its current tool set is read-only: it retrieves and analyzes data but does not create or edit campaigns.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Microsoft Advertising**.
3. Click **Install**, then set the client ID (below) and complete the Microsoft sign-in prompt.

Or run `/add-plugin microsoft-ads` in chat.

## MCP

```json
{
  "mcpServers": {
    "microsoft-ads": {
      "type": "http",
      "url": "https://partner.api.bingads.microsoft.com/ext/mcp/vnext?toolSetNames=OpenBeta",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "scopes": [
          "https://ads.microsoft.com/msads.manage",
          "offline_access"
        ]
      }
    }
  }
}
```

`toolSetNames=OpenBeta` selects the open-beta tool set, matching the server URL Microsoft documents for VS Code and Claude.

## What agents can do

| Tool | Capabilities |
| --- | --- |
| `GetAccounts` | Retrieve the advertiser accounts you can access |
| `GetCampaigns` | List and filter campaigns by name, type, budget, status, and bidding strategy |
| `GetAdGroups` | List ad groups within campaigns and review bid settings |
| `GetAds` | Review ads and find top- and under-performing creatives |
| `GetKeywords` | Review keyword inventory, match types, and keyword performance |
| `GetAssetGroups` | Retrieve Performance Max asset groups |
| `GetAudienceAssociations` | Retrieve audience targeting associations |

Every tool supports filtering, sorting, and pagination. Performance metrics are returned when a `PerformanceDateRange` is supplied, so agents can rank entities by spend, conversions, or ROAS over a period.

## Setup

Microsoft Advertising MCP authenticates through Microsoft Entra ID. Microsoft does not publish a shared OAuth client, so you register your own app once and give the plugin its client ID. No client secret is involved — Cursor authenticates as a public client using PKCE.

### 1. Create an app registration

1. In the [Microsoft Entra admin center](https://entra.microsoft.com/) (or Azure portal), go to **App registrations → New registration**.
2. Under **Supported account types**, choose the option that includes both organizational directory accounts and personal Microsoft accounts, so that any account with Microsoft Advertising access can sign in.
3. Under **Redirect URI**, select the **Public client/native (mobile & desktop)** platform and enter the first of Cursor's callbacks, then register the app.
4. Open **Authentication → Mobile and desktop applications** and make sure both callbacks are listed. Do not create a client secret.

| Surface | Redirect URI |
|:--------|:-------------|
| Desktop | `http://localhost:8787/callback` |
| Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |

5. Under **API permissions**, add the delegated **Microsoft Advertising API → msads.manage** permission. Tenants that require admin consent will need an administrator to grant it.
6. Copy the **Application (client) ID** from the app's **Overview** page.

### 2. Configure the plugin

In **Dashboard → Plugins → Configure**, set **Microsoft Entra application (client) ID**, then complete the Microsoft sign-in when Cursor prompts and grant consent.

On a team marketplace an admin sets the client ID once. Each member still signs in individually, so tools run against the advertiser accounts that member's Microsoft Advertising user can access. The `offline_access` scope lets Cursor refresh the session automatically, so you only sign in once.

## Troubleshooting

| Symptom | Cause |
|:--------|:------|
| `AADSTS50011` redirect URI mismatch | One of Cursor's callbacks above is missing from the app registration, or it was added under the **Web** platform instead of **Mobile and desktop applications**. |
| `AADSTS65001` / consent required | The `msads.manage` permission has not been consented to. Grant it yourself, or ask a tenant administrator to grant admin consent. |
| Sign-in succeeds but no accounts are returned | The signed-in Microsoft account has no Microsoft Advertising user or is not linked to any advertiser accounts. |

## Docs

- Microsoft Advertising MCP server overview: https://about.ads.microsoft.com/en/solutions/technology/mcp-server
- MCP server setup guide: https://learn.microsoft.com/en-us/advertising/guides/mcp-setup?view=bingads-13
- MCP server tools: https://learn.microsoft.com/en-us/advertising/guides/mcp-tools?view=bingads-13
- MCP server use cases: https://learn.microsoft.com/en-us/advertising/guides/mcp-use-cases?view=bingads-13
- Register an application: https://learn.microsoft.com/en-us/advertising/guides/authentication-oauth-register?view=bingads-13

Logo is Microsoft's four-square symbol, placed on a white tile with padding so it reads well in the Cursor UI, matching the Outlook and OneDrive plugins.

## License

MIT

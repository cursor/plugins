# X Ads

Cursor plugin that connects agents to the [X Ads API](https://docs.x.com/x-ads-api/introduction) through X's official hosted [Model Context Protocol](https://modelcontextprotocol.io/) server at `https://ads-api.x.com/mcp`.

This plugin signs you in with OAuth as your own X account and works with the ads accounts you can access. Agents can manage campaigns, create ads, set up pixels and conversion tracking, and pull performance stats.

This is a separate plugin from the [X](../x/) plugin: the ads MCP server lives on a different subdomain (`ads-api.x.com` vs `api.x.com`) and requires different OAuth scopes, so it needs its own authorization. Installing both means signing in twice — once per plugin.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **X Ads**.
3. Click **Install**, then complete the OAuth sign-in when prompted.

Or run `/add-plugin x-ads` in chat.

## MCP

```json
{
  "mcpServers": {
    "x-ads": {
      "type": "http",
      "url": "https://ads-api.x.com/mcp",
      "auth": {
        "CLIENT_ID": "NGdZYmo4VVp2T1BnRG55NlExOGQ6MTpjaQ",
        "scopes": [
          "ads.read",
          "ads.write",
          "media.write",
          "offline.access"
        ]
      }
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | Read your ads accounts, funding instruments, and settings |
| Campaigns | Create, update, pause, and read campaigns and line items |
| Ads & creatives | Create and manage promoted ads and creatives |
| Audiences | Read and manage targeting and audiences |
| Pixels & conversions | Set up the X pixel and conversion tracking |
| Analytics | Pull campaign, line item, and ad performance stats |

## Setup

No token to paste — the plugin ships with X's OAuth client ID (the same one the X connector uses) and requests the scopes below. On first use, Cursor opens a browser window where you sign in to X and approve access. The `offline.access` scope lets Cursor refresh the session automatically, so you only sign in once.

Requests run in your user context against the ads accounts your X account can access. You can revoke access at any time from your X account's connected apps settings.

## Scopes requested

`ads.read`, `ads.write`, `media.write`, `offline.access`

## Docs

- X Ads API: https://docs.x.com/x-ads-api/introduction
- OAuth protected resource metadata: https://ads-api.x.com/.well-known/oauth-protected-resource
- Authentication overview: https://docs.x.com/fundamentals/authentication/overview

Logo is X's official mark from the [X brand toolkit](https://about.x.com/en/who-we-are/brand-toolkit), placed on a black tile matching X's own app icon.

## License

MIT

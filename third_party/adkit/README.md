# AdKit: Meta & Google Ads

Cursor plugin that connects agents to [AdKit](https://adkit.so) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server at `https://mcp.adkit.so`.

AdKit links one workspace to ad accounts on Google Ads, Meta (Facebook and Instagram), TikTok, LinkedIn, Microsoft Ads, Reddit, and X. Agents pull spend and results down to the single ad, build and edit campaigns, search a library of 1M+ competitor ads, and generate ad images and copy. Every create or edit is a draft until you approve it in the AdKit dashboard.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **AdKit** or **Meta Ads**.
3. Click **Install**, then complete the AdKit sign-in when prompted.

Or run `/add-plugin adkit` in chat.

## MCP

```json
{
  "mcpServers": {
    "adkit": {
      "type": "http",
      "url": "https://mcp.adkit.so"
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | List your projects and the ad accounts connected to each |
| Reporting | Pull spend, results, and metrics for any account, campaign, ad set, or ad |
| Campaigns | Create and edit campaigns, ad sets, ad groups, and ads as drafts |
| Keywords | Review search terms and add negative keywords on Google Ads |
| Ad library | Search 1M+ ads on Meta, Google, and LinkedIn by advertiser, platform, or category |
| Creatives | Generate ad images and copy from a brief, or resize an existing creative |
| Media | Upload images and videos for your ads |

The hosted server is the source of truth for tool names and schemas.

## Setup

No token to paste. On first use, Cursor opens a browser window for the AdKit sign-in. Sign in, pick a project, and approve access. Requests run as you, against the ad accounts connected to that project.

You need an AdKit account with at least one ad platform connected. Connect platforms at `https://app.adkit.so/dashboard/settings/integrations`. AdKit is a paid product with a 7-day free trial.

## Notes

- Every create or edit produces a draft. Nothing spends money until you approve it in the AdKit dashboard.
- Access levels are set per project, so an agent can be limited to read-only reporting.
- One project per brand or client keeps accounts separate for agencies.

## Docs

- Getting started: https://adkit.so/docs/getting-started
- Connect Cursor: https://adkit.so/docs/clients/cursor
- Source and skills: https://github.com/adkit/ads-mcp

## License

MIT

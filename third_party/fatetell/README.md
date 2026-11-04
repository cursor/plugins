# FateTell

Plugin that connects agents to [FateTell](https://fatetell.com/mcp) through FateTell's hosted remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Chinese astrology computed by FateTell's own BaZi engine: cast a BaZi (八字, Four Pillars) chart from any birth date, open the charts saved in your FateTell account, and check today's fortune and the Chinese almanac. Connecting signs you in to a FateTell account.

The server returns deterministic data and calls no language model; your agent explains the results. The bundled `fatetell-bazi` skill covers which tool to call and how to read what comes back.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FateTell**.
3. Click **Install**, then complete the FateTell sign-in page that opens.

Or run `/add-plugin fatetell` in chat.

## MCP

```json
{
  "mcpServers": {
    "fatetell": {
      "type": "http",
      "url": "https://mcp.fatetell.com/login/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. The first request returns `401`, so sign-in happens while the client connects; the authorization server is `https://auth.fatetell.com`. Clients register through Client ID Metadata Documents or Dynamic Client Registration, so there is no client ID, key or token to configure.

## Before you connect

Any email address can sign in: FateTell sends a code to it, and a new account is free. A free account covers chart casting, the almanac and reading saved charts. FateTell's Day Master judgment, daily fortune, the chart calendar and saving new charts need an active FateTell membership, the same one used in the FateTell app.

## Tools

| Tool | Title | Needs | Access | What it does |
| --- | --- | --- | --- | --- |
| `cast_bazi_chart` | Cast BaZi chart | Free account | Read-only | Compute a BaZi chart from a birth date, time and time zone. |
| `get_almanac` | Get almanac | Free account | Read-only | Return the Chinese almanac for one to 31 consecutive days. |
| `get_fatetell_account` | Get FateTell account | Free account | Read-only | Show the connected account, membership status and remaining usage. |
| `list_saved_charts` | List saved charts | Free account | Read-only | List the charts saved in the FateTell account. |
| `get_saved_chart` | Get saved chart | Free account | Read-only | Return one saved chart in full. |
| `get_bazi_judgment` | Get BaZi judgment | Membership | Read-only | Return FateTell's Day Master verdict and favorable elements. |
| `get_daily_fortune` | Get daily fortune | Membership | Read-only | Return a saved chart's fortune for one date. |
| `get_chart_calendar` | Get chart calendar | Membership | Read-only | Return a saved chart's view of up to 31 days or 12 months. |
| `create_saved_chart` | Create saved chart | Membership | Write | Save a new chart to the account; it never edits or deletes existing charts. |

Every tool has a daily usage cap per account to prevent abuse; repeating the same request within 24 hours does not count.

## Privacy

Birth data sent for chart casting and the almanac is not stored; results stay in memory for at most 24 hours. Logs never record birth dates, birth times or place names. Signed-in reads return only what you approved on FateTell's consent page. Disconnect at any time from the FateTell website: System Settings → Connected apps.

- Privacy Policy (MCP section): https://fatetell.com/privacyPolicy#mcp
- Terms of Service (MCP section): https://fatetell.com/terms#mcp

## Testing the connector

1. Install the plugin and complete the FateTell sign-in. Any email address works; the new account is free.
2. Ask "Cast a BaZi chart, female, born 1 July 1990 at 10:00 in Sydney" and "What is today's day pillar?"; both answer on a free account.
3. Ask "List my saved FateTell charts". A new account has none; create one in the FateTell app or website, or continue with the member account below.
4. Member tools (Day Master judgment, daily fortune, chart calendar, saving a chart) need an active membership. A review account with a membership and saved charts has been sent separately to marketplace-publishing@cursor.com; it is not published here.
5. Ask to "save a new chart" to exercise the only write tool, then disconnect from the FateTell website (System Settings → Connected apps) to check revocation.

## Docs

- Documentation: https://fatetell.com/mcp/docs
- Source of the plugin files: https://github.com/RussGuo/fatetell-mcp
- Support: contact@fatetell.com

## License

MIT

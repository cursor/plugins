# Finance

Cursor plugin for Grok's **Finance** connector. The connector runs on Grok's backend; this plugin makes it discoverable and installable from the Cursor marketplace so the same connection is usable in Cursor.

Portfolio, balances, and transactions from your linked brokerages, powered by Grok.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Finance**.
3. Click **Install**.

Or run `/add-plugin finance` in chat.

## How it works

This plugin ships no MCP server of its own. Grok links your brokerage and bank accounts through Plaid and exposes the resulting portfolio data as tools. Once your Cursor and Grok accounts are linked, Cursor lists and calls those tools through the Grok connector bridge.

## Before you connect

1. Link your Cursor account to your Grok account.
2. Connect **Finance** under **Finance** in grok.com and complete its sign-in there.
3. Install this plugin in Cursor.

Installing this plugin does not start a sign-in flow. If the connector is not connected on grok.com, the plugin installs but contributes no tools until it is.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Portfolio | Holdings and allocation across linked accounts |
| Balances | Account balances and cash positions |
| Transactions | Recent activity across linked accounts |

The Grok connector runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Grok connection and its permissions, not a Cursor-held token.
- Reconnecting an expired connection is done on grok.com for now.
- Cursor and Grok de-duplicate connectors by server URL; this connector has none, so it never collides with a Cursor-native plugin.

## Docs

- Grok connectors: https://grok.com/connectors

Logo is Grok's product mark, from grok.com, because the connector runs on Grok and aggregates brokerages rather than representing a single vendor.

## License

MIT

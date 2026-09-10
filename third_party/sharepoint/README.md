# SharePoint

Cursor plugin for Grok's **SharePoint** connector. The connector runs on Grok's backend; this plugin makes it discoverable and installable from the Cursor marketplace so the same connection is usable in Cursor.

Search and read SharePoint sites, pages, and files, powered by Grok.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SharePoint**.
3. Click **Install**.

Or run `/add-plugin sharepoint` in chat.

## How it works

This plugin ships no MCP server of its own. Grok indexes the SharePoint sites you connect and answers questions grounded in their pages and files. Once your Cursor and Grok accounts are linked, Cursor lists and calls those tools through the Grok connector bridge.

## Before you connect

1. Link your Cursor account to your Grok account.
2. Connect **SharePoint** under **Connectors** in grok.com settings and complete its sign-in there.
3. Install this plugin in Cursor.

Installing this plugin does not start a sign-in flow. If the connector is not connected on grok.com, the plugin installs but contributes no tools until it is.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | Find pages and files across connected SharePoint sites |
| Read | Read page and document content with citations |
| Sites | Browse the sites and libraries you have connected |

The Grok connector runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Grok connection and its permissions, not a Cursor-held token.
- Reconnecting an expired connection is done on grok.com for now.
- Cursor and Grok de-duplicate connectors by server URL; this connector has none, so it never collides with a Cursor-native plugin.

## Docs

- Grok connectors: https://grok.com/connectors

Logo is the official Microsoft SharePoint product icon from Microsoft's Fluent brand icon CDN, on a padded white tile.

## License

MIT

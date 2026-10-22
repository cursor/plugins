# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- Added required `CLIENT_ID` and `CLIENT_SECRET` team variables. A team admin sets one Google OAuth client that every member signs in under, and the plugin no longer uses Cursor's own client. Existing installs need these set before the next connect. Requires Cursor 3.19.0 or later.

## 1.0.0 — initial release

- Added the `google-cloud-bigquery` MCP server pointing at Google Cloud BigQuery's hosted Streamable HTTP endpoint (`https://bigquery.googleapis.com/mcp`).
- Auth uses OAuth with Google Cloud BigQuery user login — no API key or client ID to configure.
- Logo: Official BigQuery product icon from Google Cloud's architecture icon set, on a padded white tile.

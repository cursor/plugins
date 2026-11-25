# FIU Global Financial Data for Cursor

This Cursor plugin connects to the FIU read-only MCP service at `https://ai.szfiu.com/api/mcp/v2`.
It provides global market quotes, K-lines, company information, financial statements, holdings,
funds, bonds, IPOs, news, announcements, calendars and macroeconomic data.

## Installation

Install `fiu-mcp-connector` from the Cursor plugin marketplace. The package includes the
`fiu-data-query` skill and the `fiu-finance-data` Streamable HTTP MCP server.

## Authentication

The server expects an FIU access token in the `Authorization` header. Set the token in the
environment before starting or restarting Cursor:

```text
FIU_API_KEY=<token from https://ai.szfiu.com/login>
```

Use the token value only. Do not include the `Bearer` prefix or quotes. The plugin injects the
header as `Authorization: Bearer ${env:FIU_API_KEY}`.

If the Cursor marketplace changes its supported secret-input syntax, update `mcp.json` to the
syntax accepted by the marketplace and keep this setup description in sync.

## Capabilities

The `fiu-data-query` skill explains how to select the narrowest FIU endpoint, resolve unknown
securities, read endpoint schemas and preserve source values and missing data. The service is
read-only and does not place orders, transfer funds or manage brokerage accounts.

## Data and service terms

The plugin contains no access token. Data availability, permissions, rate limits and service
terms are controlled by FIU. Use the service only with an account and credentials you are
authorized to use.

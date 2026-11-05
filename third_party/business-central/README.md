# Microsoft Dynamics 365 Business Central

Cursor plugin that connects agents to [Microsoft Dynamics 365 Business Central](https://www.microsoft.com/dynamics-365/products/business-central) through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts and credentials.

Work with your Business Central data: customers, vendors, items, sales and purchase documents, and the general ledger.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Business Central**.
3. Click **Install**, then sign in to Microsoft when Cursor prompts you.

Or run `/add-plugin business-central` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. Business Central does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your account. Installing the plugin is what makes the server available; there is no command to run, no endpoint to reach, and no API key or client secret to paste.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Before you connect

Cursor owns the OAuth client, so you do not need an Azure app registration of your own.

Sign-in uses OAuth 2.0 against Microsoft (Entra ID) and only accepts work or school accounts; personal Microsoft accounts cannot connect. Depending on your tenant's settings, a tenant administrator may need to consent once before members can connect.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Companies | List the companies in your Business Central environment |
| Customers and vendors | Read, create, and update customers and vendors |
| Items | Read, create, and update items |
| Sales and purchasing | Read, create, and update sales orders, sales invoices, and purchase invoices |
| Finance | Read general ledger entries and the chart of accounts |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows whatever the signed-in Microsoft user can see in Business Central. The connector cannot reach companies or records that user has no permission for.
- Some tools create and update Business Central records. Review every tool call before you approve it.
- Disconnecting is two independent steps: uninstalling the plugin stops Cursor from offering the server, and revoking Cursor's access in your Microsoft account or Entra ID settings ends Cursor's access to your data.

## Docs

- Business Central: https://www.microsoft.com/dynamics-365/products/business-central
- Business Central API: https://learn.microsoft.com/dynamics365/business-central/dev-itpro/api-reference/v2.0/
- Model Context Protocol: https://modelcontextprotocol.io

Logo is Business Central's official AppSource mark, from Microsoft's [`microsoft/BCTech`](https://github.com/microsoft/BCTech) repository.

## License

MIT

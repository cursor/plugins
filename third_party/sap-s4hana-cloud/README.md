# SAP S/4HANA Cloud

Cursor plugin that connects agents to [SAP S/4HANA Cloud](https://www.sap.com/products/erp/s4hana.html) — SAP's cloud ERP — through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts.

Work with a tenant's business partners, products, sales and purchase orders, supplier invoices, and journal entry items.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SAP S/4HANA Cloud** and click **Install**.
3. Enter the API host, communication user name, and password (see [Before you connect](#before-you-connect)).

Or run `/add-plugin sap-s4hana-cloud` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. SAP S/4HANA Cloud does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your account. There is no command to run and no MCP endpoint to configure.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Before you connect

Each person who installs the plugin enters their own three values. These are per-member settings, so a team admin cannot set them for everyone.

There is no sign-in or OAuth flow. The credential is a communication user and password from an inbound communication arrangement that exposes the OData services. A business user will not work.

Take the API host from the communication arrangement, not the Fiori launchpad host. A bare host or an https URL is accepted. It must be a tenant subdomain of `s4hana.cloud` or `s4hana.ondemand.com`. Plain http, an explicit port, or credentials in the URL are rejected. Hosts on other domains are rejected, so this is SAP S/4HANA Cloud only. Example: `my123456-api.s4hana.cloud`.

Create the communication user and inbound communication arrangement in SAP. See the SAP documentation linked under [Docs](#docs).

All three fields are required:

| Field | Value |
| --- | --- |
| `SAP_S4HANA_API_HOST` | The tenant's OData API host, from the communication arrangement. |
| `SAP_S4HANA_USERNAME` | The communication user name. |
| `SAP_S4HANA_PASSWORD` | The communication user's password. Treated as a secret and never shown back. |

## What agents can do

| Category | Capabilities |
| --- | --- |
| Business partners | Read, create, and update business partners; list addresses; create addresses; look up customers and suppliers |
| Products | Read, create, and update products; list product descriptions |
| Sales | Read, create, and update sales orders and sales order items |
| Purchasing | Read, create, and update purchase orders and purchase order items |
| Invoices | Read and create supplier invoices; list supplier invoice items |
| Finance | Read journal entry items |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows the communication user's authorizations. The connector can reach only the OData services that user is allowed to call.
- Some tools create and update records in the tenant. Review every tool call before you approve it.
- Disconnecting the connector in Cursor deletes the saved host, user name, and password.

## Docs

- SAP S/4HANA Cloud: https://www.sap.com/products/erp/s4hana.html
- Communication Management: https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/2e84a10c430645a88bdbfaaa23ac9ff7.html
- Maintain Communication Users: https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/eef80dda3867461c92ac1273689ed36f.html
- How to Create a Communication Arrangement: https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/a0771f6765f54e1c8193ad8582a32edb.html
- Model Context Protocol: https://modelcontextprotocol.io

Logo is SAP's official mark, from `sap.com`.

## License

MIT

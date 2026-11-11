# Zoho CRM

Cursor plugin that connects agents to [Zoho CRM](https://www.zoho.com/crm/) through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts and credentials.

Work with your CRM data: leads, contacts, accounts, deals, and the other modules in your Zoho CRM organization.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Zoho CRM**.
3. Click **Install**, pick your Zoho data center, then sign in to Zoho when Cursor prompts you.

Or run `/add-plugin zoho-crm` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. Zoho CRM does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your account. Installing the plugin is what makes the server available; there is no command to run, no endpoint to reach, and no API key or client secret to paste.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Before you connect

Nothing to prepare. Cursor owns the OAuth client, so you do not need a Zoho developer account or an app of your own.

Pick the data center your Zoho account lives in before you sign in. It matches the domain you use for Zoho, such as `zoho.com` or `zoho.eu`. Zoho CRM is available in the United States, Europe, India, Australia, Japan, Saudi Arabia, the United Kingdom, the United Arab Emirates, and Singapore.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Records | Read, create, update, and delete records in CRM modules such as leads, contacts, accounts, and deals |
| Queries | Search records with COQL queries |
| Settings | Read module and field settings |
| Users and organization | Read users and organization details |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows whatever the signed-in Zoho user can see. The connector cannot reach records that user has no access to.
- Some tools create, update, and delete CRM records. Review every tool call before you approve it.
- Disconnecting is two independent steps: uninstalling the plugin stops Cursor from offering the server, and revoking Cursor's access in your Zoho account settings ends Cursor's access to your data.

## Docs

- Zoho CRM: https://www.zoho.com/crm/
- Zoho CRM API: https://www.zoho.com/crm/developer/docs/api/v8/
- Model Context Protocol: https://modelcontextprotocol.io

Logo is Zoho CRM's official mark, from `zoho.com`.

## License

MIT

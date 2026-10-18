# Zoho Books

Cursor plugin that connects agents to [Zoho Books](https://www.zoho.com/books/) through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts and credentials.

Work with your accounting data: contacts, invoices, estimates, and items.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Zoho Books**.
3. Click **Install**, pick your Zoho data center, then sign in to Zoho when Cursor prompts you.

Or run `/add-plugin zoho-books` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. Zoho Books does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your account. Installing the plugin is what makes the server available; there is no command to run, no endpoint to reach, and no API key or client secret to paste.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Before you connect

Nothing to prepare. Cursor owns the OAuth client, so you do not need a Zoho developer account or an app of your own.

Pick the data center your Zoho account lives in before you sign in. It matches the domain you use for Zoho, such as `zoho.com` or `zoho.eu`. Zoho Books is available in the United States, Europe, India, Australia, Japan, Saudi Arabia, and the United Arab Emirates.

Every Zoho Books call runs against one organization. Cursor finds it when you sign in. If you belong to more than one, it uses the one Zoho marks as your default.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Contacts | Read, create, update, and delete customers and vendors |
| Invoices | Read, create, update, and delete invoices |
| Estimates | Read, create, update, and delete estimates |
| Items | Read, create, update, and delete items |
| Organization | Read organization details |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows whatever the signed-in Zoho user can see in the organization. The connector cannot reach data that user has no access to.
- Some tools create, update, and delete accounting records. Review every tool call before you approve it.
- Disconnecting is two independent steps: uninstalling the plugin stops Cursor from offering the server, and revoking Cursor's access in your Zoho account settings ends Cursor's access to your data.

## Docs

- Zoho Books: https://www.zoho.com/books/
- Zoho Books API: https://www.zoho.com/books/api/v3/
- Model Context Protocol: https://modelcontextprotocol.io

Logo is Zoho Books' official mark, from `zoho.com`.

## License

MIT

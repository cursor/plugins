# Zoho Desk

Cursor plugin that connects agents to [Zoho Desk](https://www.zoho.com/desk/) through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts and credentials.

Work with your help desk: tickets, contacts, tasks, and knowledge base articles.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Zoho Desk**.
3. Click **Install**, pick your Zoho data center, then sign in to Zoho when Cursor prompts you.

Or run `/add-plugin zoho-desk` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. Zoho Desk does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your account. Installing the plugin is what makes the server available; there is no command to run, no endpoint to reach, and no API key or client secret to paste.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Before you connect

Nothing to prepare. Cursor owns the OAuth client, so you do not need a Zoho developer account or an app of your own.

Pick the data center your Zoho account lives in before you sign in. It matches the domain you use for Zoho, such as `zoho.com` or `zoho.eu`. Zoho Desk is available in the United States, Europe, India, Australia, Japan, Canada, Saudi Arabia, the United Kingdom, the United Arab Emirates, and Singapore.

Cursor finds your Desk organization when you sign in. If you belong to more than one, it uses the one Zoho marks as your default.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Tickets | Read, create, update, and delete tickets |
| Contacts | Read, create, update, and delete contacts |
| Tasks | Read, create, update, and delete tasks |
| Knowledge base | Read, create, update, and delete articles |
| Search | Search across Desk records |
| Organization | Read basic organization details and settings |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows whatever the signed-in Zoho user can see. The connector cannot reach departments or tickets that user has no access to.
- Some tools create, update, and delete tickets, contacts, tasks, and articles. Review every tool call before you approve it.
- Disconnecting is two independent steps: uninstalling the plugin stops Cursor from offering the server, and revoking Cursor's access in your Zoho account settings ends Cursor's access to your data.

## Docs

- Zoho Desk: https://www.zoho.com/desk/
- Zoho Desk API: https://desk.zoho.com/DeskAPIDocument
- Model Context Protocol: https://modelcontextprotocol.io

Logo is Zoho Desk's official mark, from `zoho.com`.

## License

MIT

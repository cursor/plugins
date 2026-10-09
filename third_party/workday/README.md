# Workday

Cursor plugin that connects agents to [Workday](https://www.workday.com) — the cloud platform for HR, payroll, and finance — through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts and credentials.

Read a tenant's people data: workers and their profiles, supervisory organizations, time off and leave, pay groups and pay slips, job postings and candidates, and custom reports through Workday Query Language (WQL).

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Workday**.
3. Click **Install**, then sign in to Workday when Cursor prompts you.

Or run `/add-plugin workday` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. Workday does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your account. Installing the plugin is what makes the server available; there is no command to run, no endpoint to reach, and no API key or client secret to paste.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Before you connect

Nothing to prepare on the Cursor side. Cursor owns the OAuth client, so you do not need a Workday API client or integration system user of your own.

You will be asked to sign in to your Workday tenant. Authorization is per tenant — connect once per tenant you want agents to reach. If your organization restricts which applications may use Workday's API, a Workday administrator may need to approve the connection first.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Workers | Worker and employee profiles, compensation, and benefits |
| Organizations | Organizations, supervisory organizations, and their members |
| Time off | Absence balances, time-off entries, and leaves of absence |
| Time tracking | Time clock events and worker time totals |
| Payroll | Pay groups, pay components, pay slips, and payroll inputs |
| Recruiting | Job postings, prospects, and interviews |
| Reporting | WQL data sources and queries, and custom object definitions |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows whatever the signed-in Workday user can see. Workday's security groups still apply, so the connector cannot reach workers, compensation, or pay data that user has no access to.
- Workday data is often sensitive. Connect with an account whose access matches what you intend agents to read.
- Disconnecting is two independent steps: uninstalling the plugin stops Cursor from offering the server, and revoking the connection in Workday ends Cursor's access to your data.

## Docs

- Workday: https://www.workday.com
- Workday Query Language: https://doc.workday.com
- Model Context Protocol: https://modelcontextprotocol.io

Logo is Workday's official mark, from the `Workday` GitHub organization.

## License

MIT

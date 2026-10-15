# Workday

Cursor plugin that connects agents to [Workday](https://www.workday.com) — the cloud platform for HR, payroll, and finance — through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts.

Read a tenant's people data: workers and their profiles, supervisory organizations, time off and leave, pay groups and pay slips, job postings and candidates, and custom reports through Workday Query Language (WQL).

## Install

1. A team admin opens **Cursor Settings → Plugins**, searches for **Workday**, and installs it for the team.
2. The admin enters the team's Workday API client (see [Team setup](#team-setup)).
3. Each member signs in to Workday when Cursor prompts them.

Or run `/add-plugin workday` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. Workday does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your team. There is no command to run and no MCP endpoint to configure.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Team setup

Workday API clients are registered inside each customer's tenant, so Cursor cannot ship one. A team admin supplies the team's own client once, and every member signs in through it.

### 1. Register an API client in Workday

A Workday administrator registers an API client in the tenant (**Register API Client**) with:

- **Client grant type:** authorization code grant.
- **Redirection URI:** `https://www.cursor.com/agents/mcp/oauth/callback`.
- **Scopes:** the functional areas you want agents to read, such as staffing, organizations, time off, payroll, and recruiting.

After saving, **View API Clients** shows the client ID, the client secret, and the tenant's endpoint URLs.

### 2. Enter the client in Cursor

Only a team admin can save these. All six fields are required:

| Field | Value |
| --- | --- |
| `CLIENT_ID` | Client ID of the API client. |
| `CLIENT_SECRET` | Client secret of the API client. Stored encrypted and never shown back on plugin listings. |
| `TENANT` | Tenant name, for example `acme_dpt1`. Letters, digits, `_`, and `-` only. |
| `AUTHORIZATION_BASE_URL` | **Authorization Endpoint** from View API Clients (ends in `/authorize`, on the tenant's web host), or that web host's origin. Given an origin, Cursor uses `<origin>/<TENANT>/authorize`. |
| `TOKEN_ENDPOINT` | **Token Endpoint** from View API Clients, for example `https://wd2-impl-services1.workday.com/ccx/oauth2/acme_dpt1/token`. It is on the services host, not the web host, so Cursor does not derive it. |
| `REST_API_BASE_URL` | **Workday REST API Endpoint** from View API Clients, for example `https://wd2-impl-services1.workday.com/ccx/api/v1/acme_dpt1`. |

Every URL must use `https` on a Workday domain (`workday.com`, `myworkday.com`, `workdaygov.com`, or `myworkdaygov.com`, including subdomains). Cursor refuses other hosts because the client secret and members' grants are sent to them.

### 3. Members sign in

Each member signs in to Workday with their own account. The connection stays tied to the team whose client issued it, so switching teams in Cursor does not move a member's Workday session to another team's tenant.

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

- Access follows whatever the signed-in Workday user can see, intersected with the API client's scopes. Workday's security groups still apply, so the connector cannot reach workers, compensation, or pay data that user has no access to.
- Workday data is often sensitive. Grant the API client only the scopes you intend agents to read.
- If sign-in fails with "credentials are not configured for this team", a field is missing, a URL is not an `https` Workday URL, or the tenant name has unsupported characters.
- Disconnecting is independent on each side: uninstalling the plugin stops Cursor from offering the server, and disabling the API client or revoking its tokens in Workday ends Cursor's access to your data.

## Docs

- Workday: https://www.workday.com
- Workday Query Language: https://doc.workday.com
- Model Context Protocol: https://modelcontextprotocol.io

Logo is Workday's official mark, from the `Workday` GitHub organization.

## License

MIT

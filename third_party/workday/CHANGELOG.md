# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- Auth now uses the team's own Workday API client. A team admin enters six required fields: `CLIENT_ID`, `CLIENT_SECRET`, `TENANT`, `AUTHORIZATION_BASE_URL`, `TOKEN_ENDPOINT`, and `REST_API_BASE_URL`. Members then sign in individually.
- `TOKEN_ENDPOINT` is required and is never derived: Workday serves the token endpoint from the services host, not the web host that serves the authorize endpoint.
- Every URL must be `https` on a Workday domain.
- The README documents registering the API client, including the redirection URI `https://www.cursor.com/agents/mcp/oauth/callback`.

## 1.0.0 — initial release

- Added the `workday` plugin, the opt-in for the Workday MCP server that Cursor hosts and credentials.
- Carries no MCP server definition: the server is Cursor-side, so installing the plugin is the whole configuration.
- Auth is Cursor-managed OAuth against Workday, authorized per tenant.
- Logo: Workday's official mark, from the `Workday` GitHub organization.

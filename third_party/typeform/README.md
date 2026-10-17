# Typeform

Cursor plugin that connects agents to [Typeform](https://www.typeform.com) through Typeform's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Build and edit forms, set up automations, manage contacts, and analyze response data in the signed-in Typeform account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Typeform**.
3. Click **Install**, then complete the Typeform sign-in prompt.

Or run `/add-plugin typeform` in chat.

## MCP

```json
{
  "mcpServers": {
    "typeform": {
      "type": "http",
      "url": "https://api.typeform.com/mcp"
    }
  }
}
```

## Authentication

Auth is OAuth 2.0. Cursor prompts for Typeform sign-in when the plugin connects. Personal access tokens are rejected by the MCP server, so OAuth is the only path.

- **Client ID Metadata Documents (CIMD).** Typeform's authorization server identifies OAuth clients with a CIMD: the client's `client_id` is an HTTPS URL pointing at a small JSON document that the server fetches at the start of each authorization flow. There is no allowlist request, no dynamic registration call, and no client secret. The server advertises this with `client_id_metadata_document_supported: true` in its authorization server metadata.
- **PKCE is required.** CIMD clients must send `code_challenge_method=S256`.
- **All scopes are granted together.** Users can't pick a subset of scopes when connecting.
- **Refresh tokens need `offline_access`.** Clients that don't request it get no refresh token, and the connection stops working once the access token expires.
- **Endpoints are discoverable.** An unauthenticated call to the MCP endpoint returns `401` with a `WWW-Authenticate` header whose `resource_metadata` points at `/.well-known/oauth-protected-resource`, which in turn names the authorization server and its scopes. Don't hard-code authorization endpoints.

Building your own MCP client or connector for Typeform? See [Build an MCP connector](https://www.typeform.com/developers/mcp/build-a-connector/) for the CIMD format and requirements.

## Before you connect

This plugin points at `https://api.typeform.com/mcp`, which serves Typeform's default data center. EU-hosted accounts use a different URL, and the two EU hosts are **not** interchangeable:

| Account hosting | MCP endpoint | Authorization server |
| --- | --- | --- |
| Default | `https://api.typeform.com/mcp` | `https://api.typeform.com` |
| EU data center 1 | `https://api.eu.typeform.com/mcp` | `https://api.typeform.com` |
| EU data center 2 | `https://api.typeform.eu/mcp` | `https://api.typeform.eu` |

`api.typeform.eu` is a separate stack with its own issuer, authorization endpoint, token endpoint, and signing keys, so tokens are not valid across it and `api.typeform.com`. Picking the wrong host fails during the OAuth exchange rather than at install time. The same CIMD `client_id` works with both authorization servers, but each issues its own tokens.

EU data residency is an Enterprise plan feature. If you're not sure which applies, ask your Typeform Customer Success Manager. Once connected, `accounts-list_accounts` reports a `region` for each account (`null` means the default data center).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts & workspaces | List accounts and workspaces |
| Forms | List, read, create, duplicate, rename, edit, publish, and delete forms |
| Themes | List, read, create, and update themes; apply one to a form while editing |
| Automations | Create automations; add, update, reorder, and remove email, webhook, delay, and integration steps; edit triggers; publish and pause |
| Contacts | Manage contacts, lists, and custom properties, including bulk upsert, form-to-contact property mappings, and importing form responses |
| Insights | Discover queryable fields, then aggregate, rank, chart over time, or list row-level response data |
| Feedback | `submit_feedback` reports a blocker or sends feedback from inside a session |

The hosted runtime is the source of truth for tool names and schemas. The tool list is the same for every account.

### Call order

- Call `accounts-list_accounts` first: almost every other tool needs the `account_id` it returns.
- Before building or editing a form, call `forms-public_get_capabilities`. Edits go `forms-public_validate_patch` → `forms-public_patch_form` → `forms-public_publish_form`. `patch_form` saves a draft and does not publish, so only publish when the user asks for the form to go live.
- Before any analytics query, call `insights-public_discover`. Field IDs are per form.
- Reacting to a form submission is an automation, not a form.

## Notes

- Tool calls run as the Typeform user who authorizes the connection. The server's authorization challenge advertises `accounts:read`, `automations:read`, `automations:write`, `contacts:read`, `contacts:write`, `forms:read`, `forms:write`, `pages:read`, `pages:write`, `responses:read`, `responses:write`, `insights:read`, `webhooks:read`, `webhooks:write`, `workspaces:read`, and `workspaces:write`. The `scopes_supported` field of the authorization server metadata is authoritative.
- There is no sandbox: forms you publish and contacts you delete are real. Destructive tools (deleting forms, contacts, lists, and properties; updating a theme that live forms use) can't be undone.
- Access to features follows the account's Typeform plan and is enforced when a tool is called. A plan-gated call fails with `FEATURE_UNAVAILABLE` or `PAYMENT_REQUIRED`; the `details` field says which feature is gated.
- Streamable HTTP is the only supported transport. There is no SSE endpoint.
- Not available over MCP yet: full response export or deletion, workspace create/update/delete, embed codes, and deleting automations or themes. Use Typeform's REST APIs for those.
- Typeform is actively expanding and improving the capabilities in this MCP server.

## Docs

- Typeform MCP server: https://www.typeform.com/developers/mcp/
- Core concepts (endpoints, data residency, OAuth): https://www.typeform.com/developers/mcp/core-concepts/
- Build an MCP connector (CIMD): https://www.typeform.com/developers/mcp/build-a-connector/
- Supported tools and scopes: https://www.typeform.com/developers/mcp/tools/
- Connect Typeform to your AI: https://help.typeform.com/hc/en-us/articles/50533862636308
- Server URL: https://api.typeform.com/mcp

Logo is Typeform's official mark, from the `Typeform` GitHub organization.

## License

MIT

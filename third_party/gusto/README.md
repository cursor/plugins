# Gusto

Cursor plugin that connects agents to [Gusto](https://gusto.com) through Gusto's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Work with payroll, employees, contractors, time off, and reports.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Gusto**.
3. Click **Install**, then complete the Gusto sign-in prompt.

Or run `/add-plugin gusto` in chat.

## MCP

```json
{
  "mcpServers": {
    "gusto": {
      "type": "http",
      "url": "https://mcp.api.gusto.com/"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration and PKCE. Cursor registers itself and opens Gusto's sign-in when the plugin connects: sign in, pick the company if you have more than one, choose the data categories to share, and authorize. There is no API key or client ID to configure.

## Before you connect

You need a Gusto account with global or full admin permissions.

## What agents can do

Access is limited to the data categories you grant during sign-in. The server covers:

| Area | Examples |
| --- | --- |
| Company | Company details, locations, departments, onboarding status, bank accounts |
| Payroll | Payrolls, pay schedules, hours and earnings, payroll reports, running payroll |
| People | Employees, jobs, compensation, benefits, custom fields |
| Contractors | Contractors and contractor payments |
| Time | Time-off policies and requests, timesheets |
| Reports | Company reports |

Call `get_token_info` to see which scopes the current connection has. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Some tools change data in Gusto, including running payroll. Review every tool call before you approve it, and keep auto-run off for this server.
- Gusto recommends using its server in isolation, without other MCP servers in the same chat, so payroll and employee data is not passed to another service.
- Opt out of model training in your client settings. Gusto's commitment not to train on your data does not cover the client you connect.
- To change or revoke access, disconnect the server and sign in again, or remove the plugin.

## Docs

- Gusto MCP docs: https://docs.gusto.com/app-integrations/docs/mcp
- Product page: https://gusto.com/product/integrations/gusto-mcp
- Server URL: https://mcp.api.gusto.com/
- Support: mcp@gusto.com

Logo is Gusto's official mark.

## License

MIT

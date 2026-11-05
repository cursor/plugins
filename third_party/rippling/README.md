# Rippling

Cursor plugin that connects agents to [Rippling](https://www.rippling.com) through Rippling's first-party [Model Context Protocol](https://modelcontextprotocol.io/) server.

Look up people and org structure, check time off, ask about company policy, file a time-off request, or start a draft hire. Calls run as the signed-in employee, inside the access policy an admin assigned.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Rippling**.
3. Click **Install**, paste the Remote MCP server URL (below), then complete the Rippling sign-in prompt.

Or run `/add-plugin rippling` in chat.

## MCP

Rippling does not publish one shared server URL. Each employee copies the **Remote MCP server URL** from **My IT → MCP connectors** and the plugin sends traffic there:

```json
{
  "mcpServers": {
    "rippling": {
      "type": "http",
      "url": "${RIPPLING_MCP_URL}"
    }
  }
}
```

Auth is OAuth as that employee. Cursor opens Rippling's sign-in when the plugin connects. There is no API token, client ID, or client secret to configure. Do not paste a company-wide API token into this plugin.

## Before you connect

- A Rippling admin creates an access policy. Employees have no access until that policy exists.
- The company is in an active Rippling AI trial or has an active Rippling AI subscription. Tool calls return no data otherwise.
- You can open **My IT → MCP connectors** and copy the Remote MCP server URL.

Rippling documents two MCP products. This plugin is the [Rippling MCP](https://developer.rippling.com/documentation/rippling-platform/rippling-mcp/setup) for workforce data. It is separate from the MCP Gateway used to connect other products. Use the URL from the Rippling MCP setup, and do not mix the two.

## What agents can do

The Rippling MCP exposes one code tool. Its description lists the typed `codemode.*` functions the connected user is authorized to call. The model writes a JavaScript program against those functions, and the program runs inside a fresh Cloudflare Dynamic Worker isolate with no network egress. Credentials stay outside that isolate. The tool list itself does not enumerate every function; the description for the connected user is the source of truth.

| Area | What the connected user can do |
| --- | --- |
| People and org | Look up yourself, another person, direct reports, and department size, and search people |
| Time off | Look up an absence, a balance, and leave types, and file a time-off request |
| Hiring | Create a draft hire |
| Policy and products | Ask Rippling AI a plain-language question across Rippling products and company policy. The answer is read-only prose |
| Custom objects | Create, read, update, and delete custom-object records the user is allowed to touch |

## Notes

- A request also has to pass the company's MCP Gateway policies and the user's ordinary Rippling permissions. The gateway checks identity and whether that tool is allowed.
- Filing time off creates an official request in the organization's manager approval queue. Hiring and other high-impact admin actions create a draft for a person to review, and do not run immediately.
- The server does not expose Social Security numbers, home addresses, personal email addresses, or tax IDs.
- Review every write before you approve it. Access follows the signed-in employee, so a connection cannot see people or records that employee cannot see in Rippling.

## Docs

- Set up the Rippling MCP: https://developer.rippling.com/documentation/rippling-platform/rippling-mcp/setup
- Overview: https://developer.rippling.com/documentation/rippling-platform/rippling-mcp/overview
- Tools: https://developer.rippling.com/documentation/rippling-platform/rippling-mcp/tools

Logo is Rippling's mark from the [Rippling](https://github.com/Rippling) GitHub organization.

## License

MIT

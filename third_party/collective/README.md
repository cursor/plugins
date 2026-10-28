# Collective Job Search

Cursor plugin that connects agents to [Collective](https://collective.work) through Collective's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Move your job search forward with Collective Job Search. Discover and compare contract and permanent opportunities based on your skills, experience, and preferences.

Search Collective's job board by role, location, remote work, contract type, and pay. Explore available company details, compare opportunities using your connected talent profile, and open the job listings that interest you.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Collective Job Search**.
3. Click **Install**, then complete the Collective sign-in prompt.

Or run `/add-plugin collective` in chat.

## MCP

```json
{
  "mcpServers": {
    "collective": {
      "type": "http",
      "url": "https://api.collective.work/mcp/talent"
    }
  }
}
```

## Before you connect

You need a Collective talent account. Profile-based matching uses the talent profile of the account you connect.

## Example prompts

- "Find fully remote React developer jobs based in the US with Collective."
- "Find jobs on Collective that fit my profile."

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Collective account of the user who authorizes the connection.

## Docs

- Collective: https://collective.work
- Server URL: https://api.collective.work/mcp/talent

Logo is the avatar of the `Collective-work` GitHub organization. The submitted logo (`https://cdn.collective.work/cmvrxcfak00gr2ax3bkgr75a6.svg`) could not be downloaded when this plugin was added.

## License

MIT

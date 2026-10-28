# Corsair

Use the apps you've connected in [Corsair](https://corsair.dev) (Gmail, Slack, GitHub, Linear, Notion, and about 400 more) from your agent: search synced data, read apps live, make changes, and set up automations that run on a schedule or when an app sends an event.

The plugin adds the Corsair MCP server and four skills:

| Skill | Covers |
| --- | --- |
| `corsair-connect-apps` | Finding an app, handing over its sign-in link, and confirming the connection |
| `corsair-data` | When to search synced data, read an app live, or make a change |
| `corsair-automations` | Building automations from plain English or exact steps, then checking their runs |
| `corsair-approvals` | Permission modes, and what to do when an action needs approval |

## Install

1. Install the **Corsair** plugin from the Cursor marketplace.
2. The first time Cursor connects, sign in to Corsair with OAuth and approve the connection.
3. Connect each app you want to use once on Corsair (the agent can hand you the sign-in link).

To add the server manually instead, put this in your MCP config:

```json
{
  "mcpServers": {
    "corsair": {
      "type": "http",
      "url": "https://mcp.corsair.dev/mcp"
    }
  }
}
```

## Try it

- "What apps do I have connected in Corsair?"
- "List open issues in my repo on GitHub."
- "Every Friday at 5pm, post new GitHub issues to Slack."

## Support

Source: [corsairdev/agent-plugins](https://github.com/corsairdev/agent-plugins). Questions or problems: [primary@corsair.dev](mailto:primary@corsair.dev).

[Privacy policy](https://corsair.dev/privacy-policy) · [Terms](https://corsair.dev/terms-of-service)

## License

Apache-2.0

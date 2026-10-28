# Enterkey

Cursor plugin that connects agents to [Enterkey](https://enterkey.app) through Enterkey's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Enterkey answers your apartment building's buzzer and opens the door by itself for deliveries, guests, and cleaners. Make guest codes, open the door for a courier, and see who buzzed.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Enterkey**.
3. Click **Install**, then complete the Enterkey sign-in prompt.

Or run `/add-plugin enterkey` in chat.

## MCP

```json
{
  "mcpServers": {
    "enterkey": {
      "type": "http",
      "url": "https://enterkey.app/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Enterkey sign-in when the plugin connects.

## Before you connect

You need an Enterkey account with your building's buzzer pointed at your Enterkey number.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Door | Open the door for a courier or guest for a set time |
| Guest codes | Create codes for guests and cleaners |
| Activity | See who buzzed recently |

The hosted runtime is the source of truth for tool names and schemas.

## Example prompts

- "Open the door for my delivery for 5 minutes."
- "Who buzzed recently?"

## Notes

- Tool calls run under the Enterkey account of the user who authorizes the connection.
- Opening the door grants physical access to your building. Review requests before approving them.

## Docs

- Enterkey: https://enterkey.app
- Setup guide: https://enterkey.app/claude
- Server URL: https://enterkey.app/mcp

## License

MIT

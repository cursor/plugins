# Parsewise

Cursor plugin that connects agents to [Parsewise](https://parsewise.ai) through Parsewise's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Parsewise turns large sets of documents into structured, source-cited data. With this plugin, agents can create projects, upload documents, define the fields (dimensions) to extract, launch Parsewise agents, and query the results along with the source pages behind every value.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Parsewise**.
3. Click **Install**, then complete the Parsewise sign-in prompt.

Or run `/add-plugin parsewise` in chat.

## MCP

```json
{
  "mcpServers": {
    "parsewise": {
      "type": "http",
      "url": "https://api.parsewise.ai/mcp"
    }
  }
}
```

Auth is OAuth 2.0 with PKCE. Cursor prompts for Parsewise sign-in when the plugin connects, so there is no API key to configure. Refresh tokens are long-lived, so you shouldn't need to sign in again day to day.

## What agents can do

- **Projects and folders**: list, create, archive, and restore projects; organize them into folders.
- **Documents**: upload documents, list them, and read summaries, metadata, and individual pages.
- **Dimensions and agents**: define the fields to extract, create and update Parsewise agents, launch them, and track processing status.
- **Results**: list and read extracted results, and trace each value back to its source pages.

## Before you connect

You need a Parsewise account. [Get in touch](https://parsewise.ai) if your organization isn't set up yet.

## Notes

- Tool calls run as the Parsewise user who authorizes the connection and are scoped to that user's organization.
- Tools are annotated as read-only or destructive (deleting documents, dimensions, agents, or folders), so clients can ask for confirmation before destructive actions.

## License

MIT

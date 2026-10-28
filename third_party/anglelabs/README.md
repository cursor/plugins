# Artifact Publisher

Cursor plugin that connects agents to [Artifact Publisher](https://artifactpublisher.com) through Angle Labs' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Publish self-contained HTML from an agent to an unlisted share link, then read the page comments visitors leave and reply to them. A free plan is available.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Artifact Publisher**.
3. Click **Install**, then complete the Artifact Publisher sign-in prompt in your browser.

Or run `/add-plugin anglelabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "anglelabs": {
      "type": "http",
      "url": "https://app.artifactpublisher.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor discovers the authorization server from the MCP server's metadata and opens a browser consent page, so there is no API key to configure.

For headless clients that can't complete browser OAuth, create a publisher key at https://artifactpublisher.com/account/ and add it as a Bearer `Authorization` header in a local MCP override. Don't commit the key.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Publish | Publish a self-contained HTML page and get back a stable unlisted URL |
| Update | Update an existing artifact in place, keeping the same share URL |
| Feedback | Read page comments (`get_feedback`) and reply to them (`reply_to_feedback`) |

Visitors can comment on a shared page without an account. The hosted runtime is the source of truth for tool names and schemas.

## Try it

1. "Make a one-page HTML summary and publish it with Artifact Publisher; return the artifact URL."
2. Open the link and leave a comment.
3. "Get the feedback on that artifact, reply to it, then update the artifact."

## Docs

- Artifact Publisher: https://artifactpublisher.com
- MCP docs: https://artifactpublisher.com/docs/mcp/
- Server URL: https://app.artifactpublisher.com/mcp

## License

MIT-0

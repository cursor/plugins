# Replai

Cursor plugin that connects agents to [Replai](https://replai.tw) through Replai's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Set up, test and publish an AI customer support Agent for your SaaS product: inspect your Workspace and its support Agents, add knowledge, and save and run test questions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Replai**.
3. Click **Install**, then complete the Replai sign-in prompt in the browser.

Or run `/add-plugin replai` in chat.

## MCP

```json
{
  "mcpServers": {
    "replai": {
      "type": "http",
      "url": "https://api.replai.tw/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE and dynamic client registration. There is no API key to configure. When the plugin connects, Cursor opens Replai: sign in with a Google account, pick the Workspace, and click **Allow**.

## Example prompts

- "Show my Replai Workspace and its support Agents."
- "Add this text to my Agent's knowledge, do not publish: Reports export as CSV."
- "Save and run this test once: How do I export a report?"

## Notes

- Edits stay in a draft. Nothing reaches customers unless you ask to publish.
- Review every publish before you approve it.

## License

MIT

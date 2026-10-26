# TestMu AI

Cursor plugin that connects agents to [TestMu AI](https://www.testmuai.com/) (formerly LambdaTest) through TestMu AI's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run HyperExecute jobs, triage failed tests, explain SmartUI visual diffs, run accessibility checks, and manage Test Manager cases.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **TestMu AI**.
3. Click **Install**, then complete the TestMu AI sign-in prompt.

Or run `/add-plugin testmu-ai` in chat.

## MCP

```json
{
  "mcpServers": {
    "testmu-ai": {
      "type": "http",
      "url": "https://mcp.lambdatest.com/mcp"
    }
  }
}
```

Auth is OAuth. On first use Cursor redirects you to testmuai.com to sign in. There is no API key to configure.

## Before you connect

You need a TestMu AI account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| HyperExecute | Generate HyperExecute YAML and run commands, and monitor jobs |
| Test triage | Find the root cause of failed automation tests from command, network, and console logs |
| SmartUI | Explain visual diffs in plain language |
| Accessibility | Run accessibility checks on any URL |
| Test Manager | Generate and manage test cases, runs, and milestones |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the TestMu AI permissions of the user who authorizes the connection.

## Docs

- TestMu AI: https://www.testmuai.com/
- MCP server docs: https://www.lambdatest.com/support/docs/testmu-mcp-server/
- Server URL: https://mcp.lambdatest.com/mcp

Logo is the TestMu AI mark from the `LambdaTest` GitHub organization (460×460). The submitted logo URL could not be downloaded when this plugin was added.

## License

MIT

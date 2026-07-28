# Yolfi Payments

Add non-custodial crypto checkout flows to applications from Cursor. The plugin combines Yolfi's hosted OAuth MCP server with an integration skill for creating payment links and checkout sessions, configuring signed webhooks, and verifying payment status.

## Connect

Install the plugin from Cursor's marketplace and invoke a Yolfi tool. Cursor opens the Yolfi authorization flow in your browser; no API key needs to be pasted into the MCP configuration.

The server is also available locally with:

```bash
npx -y @yolfi/agent mcp
```

Documentation: https://yolfi.com/ai-agent-kit

# DashTask

Cursor plugin that connects agents to [DashTask](https://dashtask.ai/), a task manager and CRM for small teams and side hustles, through DashTask's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Agents can create, assign, and update tasks and send them for approval, and manage CRM contacts, deals, and tags. The agent works as its own AI agent seat (or as you), and a person approves the work before a task is marked Done.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **DashTask**.
3. Click **Install**, then complete the DashTask sign-in prompt.

Or run `/add-plugin dasktask` in chat.

During sign-in, choose **Connect as AI Agent** and pick an agent, or choose **Connect as Me**. Leave the Tasks, CRM, and Settings permissions on, click **Continue**, then **Close setup**.

## MCP

```json
{
  "mcpServers": {
    "dasktask": {
      "type": "http",
      "url": "https://dashtask-mcp.stevie-c03.workers.dev/mcp"
    }
  }
}
```

## Example prompts

- "Show open tasks"
- "Create a task 'Test integration' due tomorrow and assign it to yourself."
- "Move that task to In Progress status"
- "Create a CRM contact for Steve Smith at Smith Roofing"

## License

MIT

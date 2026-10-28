# TaskFuel

Give your agent access to paid tools through one TaskFuel account and prepaid balance: generate videos, images, music, and speech; search web and social data; enrich company and contact information; extract webpage content; run code; and more. Available tools depend on TaskFuel's live catalog. TaskFuel charges are separate from Cursor and Grok usage.

The bundled `taskfuel-paid-tools` skill guides tool discovery, price quotes, capped purchases, result recovery, and file delivery.

## Install

1. Install the **TaskFuel** plugin from the Cursor marketplace.
2. Open the TaskFuel MCP server and complete the browser OAuth sign-in.
3. Ask the agent to list TaskFuel's tools, check your balance, and discover a capability without spending.

To connect manually, add this to your MCP configuration:

```json
{
  "mcpServers": {
    "taskfuel": {
      "type": "http",
      "url": "https://app.taskfuel.ai/mcp"
    }
  }
}
```

## Tools

The server exposes `discover`, `quote`, `call`, `get_result`, `balance`, `rate`, and `feedback`. Only `call` spends money.

## Spending and recovery

- The agent quotes before buying and passes the quote as `max_amount_usd` on each call.
- Without prior approval, the skill asks before a call over $1 or a task total over $5. A stricter limit you set always applies.
- If a call times out, the agent retrieves it with `get_result` instead of buying again. Paid results are stored for one hour.
- A successful provider response can still be empty or unhelpful and is charged normally.

Revoke access from TaskFuel's Connected apps page when you no longer need it.

## Links

- Website: https://taskfuel.ai
- Source: https://github.com/taskfuel/grok-bot-plugin

## License

Plugin configuration and instructions are MIT licensed. TaskFuel's name and logo remain TaskFuel brand assets.

# Responses simulation requests

Use `POST https://api.phonic.ai/v1/responses`, or the discovered MCP `create_response` tool. Read the [current API contract](https://docs.phonic.ai/api-reference/responses/create.md) before constructing requests.

The endpoint is stateless: supply `system_prompt` and `input` on each request. It generates candidate responses without creating a conversation or executing the proposed tools/actions. It is experimental and may return 404 when not enabled for the workspace; explain the access requirement rather than retrying an unavailable feature.

## Select inputs

- Use this workflow for fabricated histories, edited histories, and simulated follow-up turns.
- For an existing recorded assistant turn, use `phonic-improvement-loop` or the documented conversation-item replay endpoint instead. Audio replay is a separate operation.
- Choose inputs and sample counts to match the experiment [scoped in the main skill](../SKILL.md#scope-the-experiment). Text simulation does not measure audio quality, interruptions, or live latency.

Minimal request:

```json
{
  "system_prompt": "You are a receptionist. Ask one concise question at a time.",
  "input": [{ "role": "user", "text": "Can I book an appointment tomorrow?" }],
  "num_responses": 3
}
```

## Tools and multiple turns

Define simulated custom tools inline in `tool_definitions`, using the current Phonic schema. Referenced `tools` currently support built-ins such as transfers and `choose_not_to_respond`; do not assume a stored webhook, context, MCP, or WebSocket tool can be referenced here.

To continue a simulation, choose one returned candidate and append it as an assistant input item, then append the next user input. Do not combine multiple alternative candidates into one history. If the candidate calls tools, supply corresponding `tool_call_output` items immediately after it, preserving tool-call IDs and using the documented input schema. Use clearly labeled fixture outputs; do not execute real business side effects merely to continue a simulation. If the candidate returns an action, inspect its meaning before deciding whether the scenario should end.

For a runnable REST example, see [Phonic examples](https://github.com/Phonic-Co/phonic-examples).

---
name: phonic-tools
description: Connect tools to Phonic agents and configure human transfers. Use for webhook, WebSocket, context, MCP, and built-in tools or transfer outcomes.
license: MIT
---

# Connect Phonic tools and transfers

SDKs: `npm install phonic` / `pip install phonic`. Entry points: `new PhonicClient({ apiKey })` (Node), `Phonic(api_key=...)` / `AsyncPhonic(...)` (Python). REST base: `https://api.phonic.ai/v1` with `Authorization: Bearer $PHONIC_API_KEY`. Always use the `.ai` domain for API and docs URLs — `phonic.co` addresses still resolve for backward compatibility, but all new code should use `phonic.ai`.

Fetch live docs rather than from memory: use the index at [llms.txt](https://docs.phonic.ai/llms.txt). For the REST API, see [openapi.json](https://docs.phonic.ai/openapi.json). For the WebSocket protocol, see [asyncapi.json](https://docs.phonic.ai/asyncapi.json). If an endpoint does not appear in these docs, it doesn't exist, do not invent one.

- Tools: `client.tools.create(...)`, then attach by name in agent config `tools: [...]`.

## Tools

Tool types (webhook, websocket, context, built-in transfers, MCP), reserved parameter names, and each type's request/response contract are documented in [the tools docs](https://docs.phonic.ai/docs/build/tools/tools_overview.md) — fetch the page for your tool type before implementing.

- Tool outputs must include every identifier a later tool call needs as a parameter (e.g. return the `job_id` your `update_job` tool expects) — the agent can only pass along values it has been given.
- Tools can be defined inline in the STS config (no pre-created tool): `tools: [{ "type": "custom_websocket", "execution_mode": "sync", "tool_schema": { "type": "function", "function": { ..., "strict": true } } }]` — the `strict: true` inside the function schema is required.
- If you bridge audio server-side, never do blocking I/O in the audio send/receive loop — periodic multi-second stalls in agent audio are almost always blocking code in the bridge.

## Transfers

- Transfer to a human is a built-in tool (`built_in_transfer_to_phone_number`, target number in the tool config) attached to the agent — don't hand-roll Twilio call control.
- Targets are preconfigured per transfer tool; the agent chooses among configured transfer tools and cannot dial an arbitrary number returned by another tool mid-call.
- Reading outcomes from conversation data: the transfer tool's output body has `connected: true|false` — `true` means the callee leg answered (human or voicemail); `false` means the transfer failed and the agent tells the caller.
- Voicemail detection: set `detect_voicemail: true` on the transfer tool (tools API). The agent then listens to the answered leg and a system tool call records the judgment — `tool_transfer_hit_voicemail` or `tool_transfer_successful` (= judged human). Without voicemail detection, `tool_transfer_successful` fires immediately on connect and means only "connected". Detection requires the bridged transfer mode (`use_agent_phone_number: true`, the default) — a SIP REFER handoff leaves the call and can't listen.
- The `conversation.transferred` webhook carries `transferred_to`, `call_info`, and the conversation items up to the transfer — the pre-transfer transcript arrives with the event.

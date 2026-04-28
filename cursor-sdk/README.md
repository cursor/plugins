# Cursor SDK

Cursor plugin with a single skill that helps users build on top of the Cursor TypeScript SDK (`@cursor/sdk`). The skill covers the three invocation patterns (`Agent.prompt`, `Agent.create` + `agent.send`, `Agent.resume`), the top traps for new integrations, runtime choice (local vs cloud), auth, streaming, MCP, error handling, and ready-to-extend patterns for CI, scheduled jobs, chat, and webhooks.

The skill is short by design — it points at focused reference files only when the user's task clearly falls into one of them.

## What it includes

- `cursor-sdk`: design and integration guidance for building with `@cursor/sdk`, plus reference files for runtime choice, auth, error handling, streaming, MCP, advanced features, and integration patterns.

## When to use it

Use whenever the user is integrating, installing, or writing code against the Cursor SDK; mentions `Agent.create`, `Agent.prompt`, `Agent.resume`, `agent.send`, `run.stream`, `CursorAgentError`, or `@cursor/sdk`; wants to run Cursor agents from a script, CI/CD pipeline, GitHub Action, backend service, bot, or webhook; is choosing between local and cloud runtime; is configuring MCP servers for an SDK agent; or is porting REST `/v1/agents` calls to the SDK.

The skill is the source of truth for the external `@cursor/sdk` package and is meant to be loaded eagerly rather than answered from memory.

## Reference files

The skill keeps the main `SKILL.md` short and reads a reference file only when the user's task clearly falls inside it:

| If the user is...                                                                    | Reference                              |
| ------------------------------------------------------------------------------------ | -------------------------------------- |
| Picking between local and cloud runtime                                              | `references/runtime-choice.md`         |
| Debugging auth (401s, missing key, team vs user keys)                                | `references/auth.md`                   |
| Handling errors, retries, rate limits, `CursorAgentError`, `result.status === error` | `references/error-handling.md`         |
| Consuming streams, picking event types, cancelling, or stream vs wait                | `references/streaming.md`              |
| Configuring MCP servers (HTTP, stdio, transport, auth injection)                     | `references/mcp.md`                    |
| Sub-agents, resume, artifacts, listing/inspecting agents, `Agent.messages`           | `references/advanced.md`               |
| Building a specific integration (CI review bot, triage, chat, webhook)               | `references/patterns.md`               |

## License

MIT

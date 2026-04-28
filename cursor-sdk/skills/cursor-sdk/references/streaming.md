# Streaming and Run Lifecycle

`run.stream()` is an async generator of `SDKMessage` events. Same event shapes for local and cloud runtimes — write one consumer and it works everywhere.

## When to stream vs. just `wait()`


| Situation                                             | Stream?         | `wait()`? |
| ----------------------------------------------------- | --------------- | --------- |
| Rendering live output to a user (CLI, chat, web UI)   | Yes             | Yes       |
| Fire-and-forget script that just needs success/fail   | No              | Yes       |
| CI step that wants to log tool calls for debugging    | Yes, to stderr  | Yes       |
| Observability: recording every event for later replay | Yes, persist it | Yes       |
| Polling another run you didn't launch                 | Stream is fine  | Yes       |


You almost always want `wait()`. You sometimes don't want `stream()`. There is no "stream without wait" pattern that's correct — the stream tells you what happened, `wait()` tells you whether it succeeded.

## The Canonical Consumer

```typescript
for await (const event of run.stream()) {
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") process.stdout.write(block.text);
        // block.type === "tool_use" means the assistant announced a tool call;
        // the actual execution will follow via tool_call events.
      }
      break;
    case "thinking":
      // Reasoning content. Usually hidden from end users, kept for logs.
      process.stderr.write(`[thinking] ${event.text}\n`);
      break;
    case "tool_call":
      console.error(`[tool] ${event.name} ${event.status} (${event.call_id})`);
      if (event.args !== undefined) console.error(`  args: ${JSON.stringify(event.args)}`);
      if (event.result !== undefined) console.error(`  result: ${JSON.stringify(event.result)}`);
      break;
    case "status":
      console.error(`[status] ${event.status}`);
      break;
    case "task":
      if (event.text) console.error(`[task] ${event.text}`);
      break;
    case "user":
      // Echo of the prompt. Usually ignorable.
      break;
    case "system":
      // Init metadata (model, tool list). Useful for logs.
      break;
    case "request":
      // Request tracking. Log event.request_id for correlation.
      break;
  }
}

const result = await run.wait();
```

## Event Reference

Every event has `agent_id` and `run_id`. The `type` discriminates everything else.

### `"assistant"`

Model text or tool-use announcements.

```typescript
{
  type: "assistant",
  message: { role: "assistant", content: Array<TextBlock | ToolUseBlock> }
}
```

- `TextBlock` = `{ type: "text", text: string }` — render this.
- `ToolUseBlock` = `{ type: "tool_use", id, name, input }` — the assistant is asking to call a tool. You don't need to act on it; the runtime will execute and emit `tool_call` events. Useful for UIs that want to show "calling `grep`…" the moment the LLM asks.

### `"thinking"`

Reasoning content. Keep it out of primary UI (users don't need it), keep it in logs (it's invaluable when debugging).

```typescript
{ type: "thinking", text: string, thinking_duration_ms?: number }
```

### `"tool_call"`

Actual tool execution lifecycle.

```typescript
{
  type: "tool_call",
  call_id: string,
  name: string,
  status: "running" | "completed" | "error",
  args?: unknown,
  result?: unknown,
  truncated?: { args?: boolean; result?: boolean }
}
```

Emitted once with `status: "running"` (args available, result undefined), then again with `status: "completed"` or `"error"` (result available). `truncated` flags mean the payload was trimmed server-side — don't try to parse it fully.

### `"status"`

Run lifecycle transitions. Matches `SDKStatusMessage`:


| `status` value | Means                                   |
| -------------- | --------------------------------------- |
| `"CREATING"`   | Cloud run is being set up (clone, boot) |
| `"RUNNING"`    | Actively executing                      |
| `"FINISHED"`   | Completed successfully                  |
| `"ERROR"`      | Run failed mid-flight                   |
| `"CANCELLED"`  | Run was cancelled                       |
| `"EXPIRED"`    | Run aged out                            |


**Don't treat the `FINISHED` status event as "I can skip `wait()`"** — it's a heads-up, not a terminal result. `wait()` returns a `RunResult` with usage/duration/git info you can't get from the stream.

### `"task"`

Higher-level task status messages (e.g., "Planning", "Editing files"). Optional; useful for summarized progress UI.

### `"user"`

Echo of the user prompt at the start of the run. Usually ignored by consumers.

### `"system"`

Init metadata: model actually used, tool catalog. Good to log once at stream start.

### `"request"`

Request-ID tracking for correlation with server-side observability. Log `event.request_id` if you have an internal tracing system.

## Callbacks vs. the Stream

`agent.send(...)` also takes callbacks:

```typescript
await agent.send(prompt, {
  onDelta: ({ update }) => { /* raw executor delta */ },
  onStep:  ({ step })   => { /* batched step after text/thinking/tool settle */ },
});
```

- `onDelta` fires on every raw executor delta — much finer grain than the `SDKMessage` stream. Useful for local UIs that want sub-block updates. Rare in integrations.
- `onStep` fires when a logical step completes (text + thinking + tools bundled). Similar to walking `assistant`+`tool_call` from the stream but pre-assembled.

Both callbacks are awaited before the next update is pipelined — you can apply backpressure by returning a Promise. Don't put slow I/O in `onDelta` without care; it can stall the run.

Prefer `run.stream()` for most consumers. Reach for `onDelta` / `onStep` only when you're building a local UI and need the finer shape.

## Cancellation

```typescript
if (run.supports("cancel")) {
  setTimeout(() => run.cancel(), 30_000);
}
```

`run.cancel()` is supported on both local and cloud runs. For cloud it POSTs to the server's cancel endpoint and reconciles local status from the server's authoritative response. Guard with `run.supports("cancel")` anyway — detached/replayed run handles (`Agent.getRun(...)`) may not have a live cancellation channel, and the guard is the right defensive posture.

After cancel, continue consuming the stream until it ends; you'll see a terminal `status` event and `run.wait()` will resolve with `status: "cancelled"`.

## Status Listener (stream-free observation)

If you just want to know when the run transitions and don't care about content:

```typescript
const unsubscribe = run.onDidChangeStatus(status => {
  console.error(`[status-listener] ${status}`);
});

await run.wait();
unsubscribe();
```

This doesn't require `stream()` and fires for every transition. Useful for a progress UI that doesn't render agent output.

## Observing a Run You Didn't Launch

```typescript
const existing = await Agent.getRun(runId, { runtime: "cloud", agentId: "bc-abc123", apiKey });
if (existing.supports("stream")) {
  for await (const event of existing.stream()) {
    // same loop
  }
}
const result = await existing.wait();
```

Replayed streams reconstruct events from persisted state. Tool payloads (args/result) are present when the original run captured them; older runs may be sparser.

## Backpressure and Long Streams

The async iterator applies backpressure naturally — the runtime won't produce events faster than your `for await` can drain them. But if your consumer does heavy per-event work (DB writes, network calls), you can stall the run for its lifetime. Queue and process out of band when that matters.

## Common Mistakes

- **Not draining the stream** — leaves resources open. If you open `run.stream()`, you must consume it fully or call `run.cancel()`.
- **Assuming tool `args`/`result` are always present** — they're optional; check before destructuring.
- **Parsing `tool_call.result` as a specific shape without checking `name`** — every tool has its own shape. If you need strong typing, branch on `event.name` first.
- **Reacting to `"status": "FINISHED"` as the end** — it's the terminal status, but `wait()` still has to resolve to give you usage/git/duration. Always `await run.wait()` too.


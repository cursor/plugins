# Error Handling

The single most common source of integration bugs: treating "agent couldn't start" and "agent did work and that work failed" as the same error. They aren't.

## The Two Failure Axes

```
               didn't start                 started, didn't finish cleanly
               ────────────                 ──────────────────────────────
               throws CursorAgentError      returns RunResult { status: "error" | "cancelled" }
               .isRetryable                 .id  (look it up in the dashboard)
               .code / .protoErrorCode      .durationMs   .git   .result
```

Always handle both. A try/catch alone won't catch a failed run; checking `result.status` alone won't catch auth failures.

```typescript
import { Agent, CursorAgentError } from "@cursor/sdk";

async function runOnce(): Promise<void> {
  await using agent = Agent.create({ /* ... */ });
  try {
    const run = await agent.send(prompt);
    const result = await run.wait();

    switch (result.status) {
      case "finished":
        console.log(`ok: ${result.id}`);
        return;
      case "cancelled":
        console.warn(`cancelled: ${result.id}`);
        return;
      case "error":
        throw new Error(`run ${result.id} failed after executing; inspect run state`);
      default: {
        const _exhaustive: never = result.status;
        throw new Error(`unexpected status: ${_exhaustive}`);
      }
    }
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`startup error (${err.constructor.name}): ${err.message}`);
      if (err.isRetryable) {
        // Backoff-and-retry path
      }
      throw err;
    }
    throw err;
  }
}
```

## `CursorAgentError` Subtypes

Every SDK-thrown error extends `CursorAgentError`. Check the concrete subclass to decide what to do.


| Class                 | Typical HTTP | What it means                                       | Fix                                                        |
| --------------------- | ------------ | --------------------------------------------------- | ---------------------------------------------------------- |
| `AuthenticationError` | 401          | Invalid/expired/missing key, wrong permissions      | Fix `CURSOR_API_KEY` (see `[auth.md](auth.md)`)            |
| `RateLimitError`      | 429          | Hit request or usage cap                            | Backoff; the error carries `isRetryable`                   |
| `ConfigurationError`  | 400/404      | Bad model id, malformed request, resource not found | Don't retry. Fix the call.                                 |
| `NetworkError`        | 503/504      | Upstream timeout, transient infra                   | Retry with jitter if `isRetryable`                         |
| `UnknownAgentError`   | —            | Classified neither by proto code nor HTTP code      | Log and surface; check `.cause` for the raw `ConnectError` |


They all carry:

- `message` — user-facing description (already stripped of Connect's `[unknown]` prefix)
- `isRetryable` — authoritative from the backend, not a heuristic
- `code` — the underlying Connect/gRPC `Code` when relevant
- `protoErrorCode` — fine-grained backend error code; stable enum values
- `cause` — original `ConnectError` for deep debugging; don't leak it to end users

### `UnsupportedRunOperationError`

Distinct base — it's about the SDK, not the backend. Thrown when you call `run.stream()`, `run.wait()`, `run.cancel()`, or `run.conversation()` on a `Run` that doesn't support that operation. Common trigger: `cancel()`/`stream()` on a detached handle obtained from `Agent.getRun(...)` after the live event store closed. (Cloud `conversation()` IS supported — it accumulates best-effort from the stream.)

Always prefer `run.supports(...)` over `try/catch`:

```typescript
if (run.supports("cancel")) {
  await run.cancel();
} else {
  console.warn(`cancel not supported: ${run.unsupportedReason("cancel")}`);
}
```

## Retry Patterns

**Do retry** (with backoff + jitter):

- `NetworkError` with `isRetryable === true`
- `RateLimitError` with `isRetryable === true` (rare; usually the backend wants you to wait longer than a tight retry)
- `UnknownAgentError` with `isRetryable === true` — the backend is telling you it was transient

**Don't retry**:

- `AuthenticationError` — the key won't get better
- `ConfigurationError` — bad input won't get better
- Anything with `isRetryable === false` — the backend is telling you it's terminal

Keep retries small (≤3) for agent startup; agents are expensive to re-launch. If the first attempt fails `RateLimitError` with `isRetryable === true`, back off at least 30 seconds.

```typescript
import { Agent, CursorAgentError, RateLimitError, NetworkError } from "@cursor/sdk";

async function createWithRetry(options: Parameters<typeof Agent.create>[0]) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return Agent.create(options);
    } catch (err) {
      const retryable =
        err instanceof CursorAgentError &&
        err.isRetryable &&
        (err instanceof NetworkError || err instanceof RateLimitError);
      if (!retryable || attempt === maxAttempts) throw err;
      const backoffMs = 2 ** attempt * 1000 + Math.random() * 500;
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  throw new Error("unreachable");
}
```

`Agent.create` is lazy — it doesn't hit the backend until `send()`. Most "startup" errors surface there. Wrap `agent.send(...)` with retries, not just `Agent.create(...)`.

## `RunResult.status === "error"` — What To Do

The run executed at least partially, hit something the agent couldn't recover from, and reported error. There's no stack trace in `result`; the signal is:

- `result.id` — the run ID. Fetch it with `Agent.getRun(result.id, { runtime: "cloud", agentId, apiKey })` (cloud) or `Agent.getRun(result.id, { runtime: "local", cwd })` (local), then read `run.conversation()` to see what the agent tried.
- `result.durationMs` — if 0 or tiny, the failure was very early (unlikely runtime issue).
- `result.git` — on cloud, tells you whether a branch was created before failing.
- `result.model` — confirms which model ran; useful when you're testing multiple.

You usually *don't* retry `status: "error"` automatically. The agent already burned tokens and committed to a direction; a blind retry is likely to do the same thing. Design for human triage: log the ID, surface a dashboard link, and escalate.

Retry is defensible when:

- You're doing bulk/fan-out work and a small error rate is acceptable.
- The prompt is purely read-only and idempotent.
- You've also inspected the conversation and know the failure was environmental (e.g., a flaky MCP server).

## `status: "cancelled"` — What To Do

Runs report this after a successful `run.cancel()` (local or cloud). Treat cancellation as non-fatal: log, clean up, move on. For cloud runs that were cancelled server-side (e.g., via the dashboard or a sibling caller), you'll also see `"cancelled"` when you eventually `wait()`.

## Debugging in Production

Always log at least:

- `agent.agentId` — right after create/resume, before any `send()`
- `run.id` — right after `send()`, before the stream
- `result.status`, `result.durationMs`, `result.git` — after `wait()`
- On error: the full `err.message`, `err.constructor.name`, `err.isRetryable`, and (for internal logs only) `err.protoErrorCode`

Those five are enough to correlate anything a user reports with a specific run in the Cursor dashboard.

## Don't

- **Don't `process.exit(1)` on every error**. A `RateLimitError` with `isRetryable: true` wants a backoff loop, not an exit.
- **Don't log `err.cause`** to end users — it's the raw `ConnectError` with internal fields. Log `err.message` to humans, `err.cause` to internal observability only.
- **Don't swallow `CursorAgentError`** silently into a generic `console.warn`. The subclass is the signal.
- **Don't retry `AuthenticationError` more than once** even if `isRetryable: true` — it almost always means the key is still bad.


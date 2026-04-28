---
name: cursor-sdk
description: Guide users building apps, scripts, CI pipelines, or automations on top of the Cursor TypeScript SDK (`@cursor/sdk`). Use this skill whenever the user mentions integrating, installing, or writing code against the Cursor SDK; whenever they say `Agent.create`, `Agent.prompt`, `Agent.resume`, `agent.send`, `run.stream`, `CursorAgentError`, or `@cursor/sdk`; whenever they ask to run Cursor agents programmatically from a script, CI/CD pipeline, GitHub Action, backend service, or any other code that isn't the Cursor IDE itself; and whenever they want to pick between local and cloud runtime, configure MCP servers for an SDK agent, or handle streaming, cancellation, or errors from an SDK agent. Also trigger when a user is wiring Cursor into an automation, writing a bot that runs Cursor, or porting REST `/v1/agents` calls to the SDK, even if they don't explicitly name the package. Use this eagerly rather than answering from memory; the SDK surface evolves and this skill plus its references are the source of truth for the external package.
---

# Cursor SDK

The Cursor TypeScript SDK (`@cursor/sdk`) runs Cursor agents programmatically. The same interfaces drives the local runtime (agent runs on your machine against your files) and the cloud runtime (agent runs on Cursor-hosted or self-hosted infrastructure against a cloned repo and opens PRs).

Use this skill to help someone **bootstrap a working integration quickly** and **avoid the handful of traps that bite new users**. Canonical docs live at [https://cursor.com/docs/api/sdk/typescript](https://cursor.com/docs/api/sdk/typescript); this skill only adds decision-making, failure-mode prevention, and ready-to-extend patterns.

## Voice and Posture

This skill helps the user **build** with the SDK. It is not the place to validate, congratulate, or sell the SDK as a choice. The user's intent is the input; your job is execution.

- **When the user names the SDK explicitly** (says "Cursor SDK", `@cursor/sdk`, `Agent.create`, `Agent.prompt`, etc.): assume they know what the SDK is and have decided to use it. Skip framing, skip pep talk, go straight to producing the integration. No "good news", no "the SDK is perfect for this", no "this is almost exactly the pattern X is designed for".
- **When the user describes a problem the SDK fits but doesn't name it** ("I want a bot that reviews my PRs", "I want a script that asks Cursor questions about my repo"): the SDK isn't yet a confirmed choice. Surface it as a question, briefly, then wait: *"The Cursor SDK is what I'd reach for here — want me to design it that way, or do you have a different runtime in mind?"* If they confirm, proceed. If they push back or want options, give options.
- **In either case, don't restate the user's intent back to them.** They know what they want. Get to the design.

Avoid these specific openers (and their close cousins):

- "Good news: this is exactly the pattern…"
- "The SDK is built for this shape."
- "Great, you've come to the right place."
- "This is almost exactly the X the SDK is designed for."
- Any lede that compliments the user's choice or restates their goal in flattering terms.

Prefer:

- Open with the design decision or the first thing they need to know.
- If you genuinely have a design choice to flag (local vs cloud, prompt vs send, sync vs stream), name it in one sentence and explain why; don't preface it with validation.

## When to open a reference file

Keep this page short. Read a reference file only when the user's task clearly falls inside it:


| If the user is...                                                                    | Read                                                           |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Picking between local and cloud runtime, or not sure which they should use           | [`references/runtime-choice.md`](references/runtime-choice.md) |
| Debugging auth (401s, "Missing CURSOR_API_KEY", team-vs-user keys, local vs prod)    | [`references/auth.md`](references/auth.md)                     |
| Handling errors, retries, rate limits, `CursorAgentError`, `result.status === error` | [`references/error-handling.md`](references/error-handling.md) |
| Consuming streams, picking event types, cancelling, or deciding stream vs wait       | [`references/streaming.md`](references/streaming.md)           |
| Configuring MCP servers (HTTP, stdio, cloud vs local transport, auth injection)      | [`references/mcp.md`](references/mcp.md)                       |
| Using sub-agents, resume, artifacts, listing/inspecting agents, `Agent.messages`     | [`references/advanced.md`](references/advanced.md)             |
| Building a specific integration (CI review bot, scheduled triage, chat, webhook)     | [`references/patterns.md`](references/patterns.md)             |


Everything below is the minimum needed for 80% of tasks.

## The Three Invocation Patterns

Almost every SDK integration collapses to one of three shapes. Pick the one that fits the job, don't mix them.

### 1. `Agent.prompt(...)` — one-shot

```typescript
import { Agent } from "@cursor/sdk";

const result = await Agent.prompt("Refactor src/utils.ts for readability", {
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
});
console.log(result.status, result.result);
```

Use for fire-and-forget scripts, GitHub Actions steps, or any "send this prompt, get a result, exit" flow. No streaming, no follow-ups, no cleanup to remember. If you're reaching for this and then immediately resuming, you wanted pattern 2 instead.

### 2. `Agent.create(...)` + `agent.send(...)` — durable with follow-ups

```typescript
import { Agent } from "@cursor/sdk";

const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
});

try {
  const run = await agent.send("Find the bug in src/auth.ts");
  for await (const event of run.stream()) {
    if (event.type === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") process.stdout.write(block.text);
      }
    }
  }
  const result = await run.wait();

  // Follow-up keeps full conversation context.
  const run2 = await agent.send("Now write a regression test for it");
  await run2.wait();
} finally {
  await agent[Symbol.asyncDispose]();
}
```

Use when you need streaming, multi-turn conversation, or lifecycle operations (cancel, status listener). This is the shape of most non-trivial integrations.

### 3. `Agent.resume(...)` — pick up an existing agent later

```typescript
const agent = Agent.resume(previousAgentId, {
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
});
const run = await agent.send("Also update the changelog");
await run.wait();
```

Use across process boundaries: a cron that continues last night's cleanup, a webhook that extends a user's agent, an interactive CLI that reloads conversation state. **Inline `mcpServers` are not persisted across resume** — pass them again on the resume call.

## Top Five Traps (read these before writing code)

These trip up almost every new integration. They're all easy to prevent once you know about them.

### 1. Missing `cloud: { repos }` silently defaults to local

`AgentOptions` doesn't require `local` or `cloud`; if you omit both, the SDK selects the local runtime. The trap: if you intended a cloud agent and forgot the `cloud:` field, you get a local agent silently — no error, just a local agent ID and a local executor. Always pass `cloud: { repos }` explicitly when you want cloud, and pass `local: { cwd }` explicitly for local even though it's the default. Picking the right runtime: see [`references/runtime-choice.md`](references/runtime-choice.md).

### 2. Two different kinds of failure, one instinct to conflate them

```typescript
try {
  const run = await agent.send(prompt);
  const result = await run.wait();
  if (result.status === "error") {
    // Agent started but failed mid-run. Inspect transcript, git state, tool outputs.
    console.error(`run failed: ${result.id}`);
    process.exit(2);
  }
} catch (err) {
  if (err instanceof CursorAgentError) {
    // Didn't start. Auth, config, network. Fix environment, retry.
    console.error(`startup failed: ${err.message}, retryable=${err.isRetryable}`);
    process.exit(1);
  }
  throw err;
}
```

`CursorAgentError` thrown → the run never executed (auth, config, network). `result.status === "error"` → the agent did work, and that work failed. Different fixes, different exit codes, different observability. Full taxonomy in [`references/error-handling.md`](references/error-handling.md).

### 3. Forgetting `await agent[Symbol.asyncDispose]()` leaks resources

The SDK holds handles to local executors, persisted run stores, and cloud API clients. Not disposing means leaked child processes, open databases, and in long-running services, memory growth. Always dispose in a `finally`, or use `Agent.prompt()` (disposes for you), or use the `await using` syntax if your tsconfig targets it:

```typescript
await using agent = Agent.create({ /* ... */ });
```

### 4. Streaming is optional but `wait()` is (almost) required

`run.stream()` is how you observe; `run.wait()` is how you get the terminal result. You can skip streaming, but skipping `wait()` means you can't tell whether the run finished, errored, or was cancelled, and you'll leak the run's internal watchers. Always call `wait()`. If you don't want live output, just call `wait()` alone. See [`references/streaming.md`](references/streaming.md) for event type reference.

### 5. Not every `run` operation is supported on every runtime

`Run` exposes four operations — `stream`, `wait`, `cancel`, `conversation` — and the runtime may or may not support each. Always guard with `run.supports("...")` before calling, rather than assuming:

```typescript
if (run.supports("cancel")) await run.cancel();
if (run.supports("conversation")) console.log(await run.conversation());
```

Current gap worth knowing about: detached/re-hydrated runs (you got the handle from `Agent.getRun(...)` after the live event store has closed) may not support `stream()` and may have empty `conversation()`. `run.unsupportedReason(op)` tells you why. Cloud `run.conversation()` IS supported — it accumulates best-effort from the stream.

## Local vs Cloud, in one sentence each

- **Local** — runs on the caller's machine against `cwd`, reuses their environment and credentials, good for dev loops and CI that already has a repo checkout.
- **Cloud** — runs on a Cursor-hosted VM against a freshly cloned `repos[].url`, good for long jobs, fire-and-forget automation, and opening real PRs (`autoCreatePR: true`).

Decision tree, capability differences, and capability gaps (artifacts, cancel, MCP transport): [`references/runtime-choice.md`](references/runtime-choice.md).

## Auth, minimum viable

```bash
export CURSOR_API_KEY="cursor_..."  # user API key or team service-account key
```

The SDK reads `CURSOR_API_KEY` if `apiKey` isn't passed. Both user keys (from [https://cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents)) and team service-account keys (Team Settings → Service accounts) work for local and cloud runs.

If you're seeing 401s, the usual suspects are: key pasted with surrounding whitespace, key minted against a different environment, or the key belongs to a user without repo access for a cloud run. Full troubleshooting: [`references/auth.md`](references/auth.md).

## Model Selection

```typescript
import { Cursor } from "@cursor/sdk";

const models = await Cursor.models.list({ apiKey: process.env.CURSOR_API_KEY! });
```

`composer-2` is the current default for most integrations. `{ id: "auto" }` lets the server pick. Model IDs change; don't hardcode exotic ones without calling `Cursor.models.list()` first to confirm the caller has access.

Model is **required for local**, **optional for cloud** (the server resolves a default from the caller's account).

## Production Best Practices

Apply these to any integration that runs unattended:

1. **Wrap every `Agent.create` / `Agent.prompt` / `Agent.resume` in a try/finally with `[Symbol.asyncDispose]()`**. Non-negotiable.
2. **Distinguish startup failures from run failures** — exit code 1 for `CursorAgentError`, exit code 2 for `result.status === "error"`, exit code 0 only for `finished`. Makes CI failures actually readable.
3. **Log `run.id` and `agent.agentId` immediately after `send()`** before streaming. If the stream hangs, the IDs are what you need to investigate in the dashboard or via `Agent.getRun(...)`.
4. **Respect `error.isRetryable`** — it's the backend telling you the specific failure is safe to retry. Blind retries can cause duplicate cloud runs; respecting the flag doesn't.
5. **Use `local: { settingSources: [] }` (default) unless you need ambient config.** Opting into `"all"` loads project/user/team/MDM settings from the caller's environment, which is rarely what you want from a service. Note: `settingSources` lives under `local`, not at the top level; it has no effect on cloud agents (cloud always honors team/project/plugins).
6. **For cloud agents in CI, set `skipReviewerRequest: true`** unless a human should be paged — it suppresses the reviewer-request step and keeps PR notifications quiet.
7. **Always pass `apiKey` explicitly** in shared-infrastructure code instead of relying on the env var. Makes the credential dependency obvious and prevents cross-tenant mistakes.
8. **Prefer `Agent.prompt(...)` for true one-shots** — it disposes for you and is harder to leak.

Longer version with examples: [`references/patterns.md`](references/patterns.md).

## Observing a Run You Didn't Launch

You can inspect any agent/run by ID later:

```typescript
// Cloud: IDs that start with "bc-" auto-route to the cloud API
const info = await Agent.get("bc-abc123", { apiKey });
const run = await Agent.getRun(runId, { runtime: "cloud", agentId: "bc-abc123", apiKey });

// Local: you need the cwd where the agent was created
const localInfo = await Agent.list({ runtime: "local", cwd: process.cwd() });
```

A cloud `bc-`-prefixed agent ID is **not** a run ID. If you only have a run ID (from a log or a webhook), pass it to `Agent.getRun` with the runtime hint; don't confuse the two.

## Offering a Canvas

If the user's integration monitors, lists, or visualizes agents — dashboards of active runs, conversation replays, tool-call timelines — offer a Cursor Canvas to render it. If they accept, defer entirely to the `canvas` skill.

## What This Skill Doesn't Cover

- The Cloud Agents REST API (`/v1/agents/*`). If the user needs a non-TS client, the REST API is documented separately at <https://cursor.com/docs/cloud-agent/api>; check there for current capabilities before assuming parity with the SDK.
- `.cursor/hooks.json` hooks. Cloud agents execute them but the SDK doesn't manage them; see Cursor's Hooks docs.
- Private workers / self-hosted cloud. Send users to the Private Workers docs.
- Python / non-TS SDKs. There is no first-party SDK in other languages at time of writing; REST is the portable option.


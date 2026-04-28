# Advanced: Sub-agents, Resume, Artifacts, Inspection

You have a working `Agent.create` + `send` + `wait` loop. These are the capabilities you reach for next.

## Sub-agents

Sub-agents are **cloud-only at v1**. The `agents:` field on `AgentOptions` is wired through `customSubagents` on the cloud create call; the local executor silently drops it. If you pass `agents` alongside `local: { ... }`, nothing happens. Scope sub-agent designs to cloud agents until local parity ships.

Define named sub-agents that the main agent can spawn via the `Agent` tool:

```typescript
const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  cloud: {
    repos: [{ url: "https://github.com/your-org/your-repo", startingRef: "main" }],
  },
  agents: {
    "code-reviewer": {
      description: "Expert code reviewer for quality and security.",
      prompt: "Review code for bugs, security issues, and proven approaches. Be concrete and cite file:line.",
      model: "inherit",
    },
    "test-writer": {
      description: "Writes tests for code changes.",
      prompt: "Write comprehensive unit and integration tests. Use the project's test framework.",
    },
  },
});
```

The key-name (`"code-reviewer"`) is how the main agent refers to the sub-agent. The `description` tells it when to invoke; the `prompt` is the sub-agent's system prompt.

### Good use cases

- **Specialized review** — spawn a reviewer sub-agent to audit changes the main agent just made.
- **Parallel research** — the main agent delegates "summarize X", "summarize Y", "summarize Z" to three sub-agents simultaneously.
- **Risk quarantine** — isolate destructive operations in a named sub-agent with a restricted prompt.

### Bad use cases

- Replacing normal helper functions. If it doesn't need LLM reasoning, don't make it a sub-agent.
- Deeply nested "agents calling agents calling agents" chains. One level of sub-agents is almost always enough; beyond that you usually want a different architecture.

### Sub-agent MCP

Cloud sub-agents reference parent MCP servers by **name**, not inline config. Inline `McpServerConfig` entries are rejected at v1 with `ConfigurationError("cloud custom subagents only support string references in v1.")`. Configure the server on the parent's `mcpServers` map and reference it by key from the sub-agent:

```typescript
const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  cloud: { repos: [{ url: "https://github.com/your-org/your-repo", startingRef: "main" }] },
  mcpServers: {
    postgres: {
      type: "http",
      url: "https://mcp.example.com/postgres",
      headers: { Authorization: `Bearer ${process.env.PG_RO_TOKEN!}` },
    },
  },
  agents: {
    "db-reader": {
      description: "Answers read-only questions against the database.",
      prompt: "Query with read-only SQL. Never execute writes.",
      mcpServers: ["postgres"],
    },
  },
});
```

The parent's `mcpServers` is the truth; sub-agents pick by name from that map.

## Resuming Agents

Agent IDs persist. Resume later from any process with the right options:

```typescript
const agent = Agent.resume(agentId, {
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
  mcpServers: sameInlineMcpYouUsedBefore, // inline MCP is not persisted!
});
const run = await agent.send("continue where we left off");
```

### What persists

- Conversation history and agent state.
- Agent-scoped settings that were baked in at creation time server-side.
- Cloud: the whole agent (clone, branch, PR state if any).

### What does not persist

- **Inline `mcpServers`** — pass them again on resume.
- Local: the `cwd` is identified by path. If the path is gone, resume can't find the local agent.
- **`local.settingSources`** — ambient configuration is reloaded based on current environment.

### Finding agents to resume

```typescript
// Local agents under a cwd:
const local = await Agent.list({ runtime: "local", cwd: process.cwd(), limit: 20 });

// Cloud agents for the caller:
const cloud = await Agent.list({ runtime: "cloud", apiKey });

// Or a specific cloud agent by ID:
const one = await Agent.get("bc-abc123", { apiKey });
```

Both list calls return `{ items, nextCursor }`. Use `nextCursor` for pagination.

## Inspecting Runs

```typescript
const runs = await Agent.listRuns(agentId, { runtime: "local", cwd: process.cwd() });
const run  = await Agent.getRun(runs.items[0].id, { runtime: "local", cwd: process.cwd() });

// Replay the stream (works when the persisted events are available):
if (run.supports("stream")) {
  for await (const event of run.stream()) { /* ... */ }
}
```

`run.conversation()` returns accumulated `ConversationTurn[]` — useful for rendering a transcript UI. Live local runs include tool-call details; replayed runs reconstruct from the persisted stream and may be sparser if the originating runtime didn't capture tool args/results.

### Cloud run IDs vs. agent IDs

Cloud agent IDs start with `bc-`. Cloud run IDs look like regular UUIDs. **Don't pass a `bc-` ID to `getRun` expecting it to work** — you need the run ID.

To get a run ID from a cloud `bc-` agent:

```typescript
const runs = await Agent.listRuns("bc-abc123", { runtime: "cloud", apiKey });
for (const r of runs.items) console.log(r.id);
```

## Persisted Messages

`run.conversation()` is scoped to one run. To get the full persisted conversation across all runs of an agent:

```typescript
const messages = await Agent.messages.list(agentId, { runtime: "local", cwd: process.cwd() });
```

Messages are a raw, schema-stable shape — user turns, assistant turns, metadata. You'll usually pass them through `extractReadableMessages(...)`-style helpers in your code to render.

## Artifacts

On cloud agents, the agent can produce artifact files beyond the git diff — think test results, coverage reports, generated assets:

```typescript
const artifacts = await agent.listArtifacts();
for (const a of artifacts) console.log(a.path, a.sizeBytes);

const buffer = await agent.downloadArtifact(artifacts[0].path);
```

Local agents currently return an empty list from `listArtifacts()` and throw from `downloadArtifact()`. Treat artifact flows as cloud-only today.

## Lifecycle: archive, unarchive, delete

```typescript
await Agent.archive("bc-abc123",   { apiKey });
await Agent.unarchive("bc-abc123", { apiKey });
await Agent.delete("bc-abc123",    { apiKey });
```

- **Archive** hides the agent from default lists but keeps history (`includeArchived: true` on `Agent.list({ runtime: "cloud" })` to include them).
- **Unarchive** reverses it.
- **Delete** is destructive — no undo. Scope cautiously.

Missing IDs throw. Don't swallow the error; a missing ID usually means your bookkeeping is wrong.

## Account and Catalog

```typescript
import { Cursor } from "@cursor/sdk";

const me      = await Cursor.me({ apiKey });               // apiKeyName, userEmail, createdAt
const models  = await Cursor.models.list({ apiKey });       // available model IDs
const repos   = await Cursor.repositories.list({ apiKey }); // GitHub repos the caller has connected
```

- `Cursor.models.list()` — call before constructing options if you don't know what's available. Don't hardcode exotic model IDs.
- `Cursor.repositories.list()` — gives you `cloud.repos[].url` entries the caller can actually use. If you're building a UI that asks the user to pick a repo, this is your source.
- `Cursor.me()` — confirms the key's identity. Useful in ops tooling.

All three are cloud-only and require an API key.

## `agent.reload()`

Call after you change local settings (`.cursor/*`, MCP config files, hook files) if you want the underlying local executor to pick them up without recreating the agent:

```typescript
await agent.reload();
```

Doesn't apply to in-flight runs — it affects future `send()` calls.

## Putting It Together — Long-Lived Service

```typescript
import { Agent } from "@cursor/sdk";

export class MyAgentOrchestrator {
  async runOrContinue(agentId: string | undefined, prompt: string) {
    const apiKey = process.env.CURSOR_API_KEY!;
    const options = {
      apiKey,
      model: { id: "composer-2" },
      local: { cwd: "/var/app/repo" },
      mcpServers: {
        linear: {
          type: "http" as const,
          url: "https://mcp.linear.app/sse",
          headers: { Authorization: `Bearer ${process.env.LINEAR_API_KEY!}` },
        },
      },
    };
    await using agent = agentId
      ? Agent.resume(agentId, options)
      : Agent.create(options);

    const run = await agent.send(prompt);
    const result = await run.wait();
    return { agentId: agent.agentId, runId: run.id, status: result.status };
  }
}
```

Key choices:

- `await using` syntax means you can't forget to dispose.
- MCP config re-passed every call so resume works.
- Persisted `agentId` in the caller's DB; resume on subsequent requests.


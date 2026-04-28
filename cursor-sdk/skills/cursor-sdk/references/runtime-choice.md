# Runtime Choice: Local vs Cloud

The SDK exposes one surface on top of two very different runtimes. Picking the wrong one isn't fatal but will burn hours. Pick deliberately.

## Decision Tree

Start here:

1. **Does the agent need to open a PR on GitHub?** → Cloud. Local agents modify files in `cwd`; they don't branch or push.
2. **Will the agent run longer than the caller's process can stay alive?** (cron that fires a fire-and-forget job, webhook that spawns overnight work) → Cloud. The agent outlives your script.
3. **Does the agent need compute, isolation, or credentials the caller's machine doesn't have?** (sandboxed eval, controlled env vars, pinned runtime) → Cloud.
4. **Is this a dev-loop script, CI step that already checked out the repo, or a CLI against the user's current project?** → Local. The repo is already on disk; cloud would re-clone it for no reason.
5. **Does the user want to run without a network call to GitHub?** (air-gapped, non-GitHub repo, experiments on uncommitted code) → Local. Cloud requires a GitHub repo URL.

If two points pull opposite ways, Cloud is usually the safer pick for production integrations and Local for dev tooling.

## Capability Matrix


| Capability                         | Local                                 | Cloud (Cursor-hosted)                                         |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| Opens real PRs                     | No                                    | Yes (`cloud.autoCreatePR: true`)                              |
| Works on uncommitted local changes | Yes                                   | No — clones from `startingRef`                                |
| Outlives caller process            | No                                    | Yes — resumable by `agentId`                                  |
| Cancellable mid-run                | Yes                                   | Yes (server-side; check `run.supports("cancel")` defensively) |
| Artifact download                  | Not implemented yet                   | Yes                                                           |
| MCP stdio transport                | Yes                                   | Yes (command runs inside the cloud VM)                        |
| MCP HTTP transport                 | Yes                                   | Yes                                                           |
| Ambient Cursor settings            | Opt-in via `settingSources`           | Always enterprise/team hooks respected                        |
| Requires GitHub repo               | No                                    | Yes (`cloud.repos[].url`)                                     |
| Requires API key                   | For remote model calls (most prompts) | Always                                                        |


## Local Runtime — How It Actually Works

```typescript
const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: "/absolute/or/relative/path/to/repo" },
});
```

- `cwd` is where the agent reads and writes files. The type accepts a string array, but the local executor currently uses only the first entry (`platform.ts`'s `getCwd` returns `cwd[0]`); pass a single path until multi-root ships.
- The agent spawns in-process helpers (tool execution, shell runner, MCP stdio processes). Dispose cleanly to reap them.
- Persisted state lives under `cwd`'s Cursor data directory. `Agent.list({ runtime: "local", cwd })` surfaces previously-created agents there.
- Ambient settings (project rules, team policies, team-configured MCP servers) are **not** loaded by default. Pass `settingSources` **inside `local`** (e.g. `local: { cwd, settingSources: ["project"] }`, or `"all"` for everything) to opt in.
- Local runs execute tools on the caller's machine with the caller's permissions. Treat the agent like you'd treat `rm -rf` — scoped `cwd`, no secrets in env vars you don't want exposed.

When to prefer local:

- CLI tooling, editor integrations, dev scripts.
- CI steps where the repo is already checked out and you want to inspect the tree directly.
- Fast iteration: no network clone, no PR, no reviewer notification.

## Cloud Runtime — How It Actually Works

```typescript
const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  cloud: {
    repos: [{ url: "https://github.com/your-org/your-repo", startingRef: "main" }],
    autoCreatePR: true,
    skipReviewerRequest: true, // Keep CI quiet; flip to false for review-worthy changes
  },
});
```

- Cursor provisions a VM, clones `repos[].url` at `startingRef`, runs the agent, pushes a branch, and (if `autoCreatePR`) opens a PR.
- Agent IDs are prefixed `bc-` (background composer). SDK helpers (`Agent.get`, `Agent.archive`, etc.) auto-route on that prefix.
- The caller (the user behind `CURSOR_API_KEY`) must have a GitHub connection to the target repo. If not, the cloud side returns `ERROR_GITHUB_NO_USER_CREDENTIALS` — it's an environment setup issue, not a code bug.
- `run.cancel()` is supported on cloud (server-side cancel); still guard with `run.supports("cancel")` for defensive portability.
- Set `workOnCurrentBranch: true` only when you want the agent to push to an existing branch — rare, and usually means you're trying to emulate local; use local instead.

When to prefer cloud:

- Anything that opens a PR for a human to review.
- Scheduled/automated work that shouldn't block a local process.
- Parallel fan-out across many repos or branches.
- Running against a repo the caller doesn't have checked out.

## Common "I meant the other one" Symptoms

- **"Agent created but nothing happened on GitHub"** — you passed `local:` when you meant `cloud:`. Local doesn't push.
- **"Cloud agent can't see my uncommitted changes"** — by design. Commit or use local.
- **"Cloud agent said it can't find my GitHub repo"** — the caller's Cursor account doesn't have a GitHub connection for that repo. Not a code bug; sort it in the dashboard.
- **"`run.cancel()` throws on my run"** — usually a detached run handle (`Agent.getRun(...)` on a run whose live channel is gone). Guard with `run.supports("cancel")` before calling.
- **"I tried to reuse an agent across machines"** — cloud agents resume anywhere (`Agent.resume(bcId, { ... })`). Local agents are scoped to their `cwd`'s data directory; resume from another machine gives you a fresh agent.

## Hybrid: running a local and a cloud agent from the same script

Perfectly fine, common pattern (e.g., local inspection + cloud PR). Each agent is independent; dispose both.

```typescript
const localAgent = Agent.create({ /* ... local */ });
const cloudAgent = Agent.create({ /* ... cloud */ });
try {
  const summary = await Agent.prompt("Summarize the diff on HEAD", {
    apiKey,
    model: { id: "composer-2" },
    local: { cwd: process.cwd() },
  });
  const cloudRun = await cloudAgent.send(`Follow up on: ${summary.result}`);
  await cloudRun.wait();
} finally {
  await localAgent[Symbol.asyncDispose]();
  await cloudAgent[Symbol.asyncDispose]();
}
```


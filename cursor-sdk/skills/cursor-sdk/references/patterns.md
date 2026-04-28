# Integration Patterns

Five starting templates for the shapes people actually build. Copy one, delete what you don't need.

Each pattern applies the [error-handling](error-handling.md) and [streaming](streaming.md) best practices from the rest of this skill — don't strip them when adapting.

---

## 1. GitHub Action: automated code review on PRs

Goal: when a PR opens, run a cloud agent against it, post review comments.

```typescript
import { Agent, CursorAgentError } from "@cursor/sdk";

async function main() {
  const {
    PR_URL,
    REPO_URL,
    HEAD_REF,
    BASE_REF,
    CURSOR_API_KEY,
    GITHUB_TOKEN,
  } = process.env;

  if (!CURSOR_API_KEY || !REPO_URL || !HEAD_REF) {
    console.error("Missing required env: CURSOR_API_KEY, REPO_URL, HEAD_REF");
    process.exit(1);
  }

  await using agent = Agent.create({
    apiKey: CURSOR_API_KEY,
    model: { id: "composer-2" },
    cloud: {
      repos: [{ url: REPO_URL, startingRef: HEAD_REF }],
      workOnCurrentBranch: true,
      skipReviewerRequest: true, // don't re-page reviewers
    },
    mcpServers: GITHUB_TOKEN
      ? {
          github: {
            type: "stdio",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"],
            env: { GITHUB_TOKEN },
          },
        }
      : undefined,
  });

  const prompt = `Review the changes on ${HEAD_REF} vs ${BASE_REF} for ${PR_URL}.
Focus on: correctness, security, readability. Post GitHub review comments inline
for concrete issues. No praise-only comments. If nothing to flag, say so.`;

  try {
    const run = await agent.send(prompt);
    console.log(`[review] agent=${agent.agentId} run=${run.id}`);

    for await (const event of run.stream()) {
      if (event.type === "status") console.log(`[review] ${event.status}`);
      if (event.type === "tool_call" && event.status !== "running") {
        console.log(`[review] tool: ${event.name} -> ${event.status}`);
      }
    }

    const result = await run.wait();
    if (result.status !== "finished") {
      console.error(`[review] run ${result.id} ended as ${result.status}`);
      process.exit(2);
    }
    console.log(`[review] done: ${result.durationMs}ms`);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`[review] startup failed: ${err.message}`);
      process.exit(err.isRetryable ? 75 : 1); // EX_TEMPFAIL for transient
    }
    throw err;
  }
}

main();
```

Why this shape:

- Cloud runtime (needs to post GitHub comments; works independently of the runner).
- `skipReviewerRequest: true` keeps the action quiet in CI.
- Exit codes: `0` finished, `1` permanent startup failure, `2` run finished with status `error`, `75` transient retryable failure.

---

## 2. Scheduled triage: cron-driven cloud runs with resume

Goal: every morning, resume yesterday's triage agent and ask it to triage today's new Linear tickets.

```typescript
import { Agent, CursorAgentError } from "@cursor/sdk";
import { readFile, writeFile } from "node:fs/promises";

const STATE_PATH = "/var/lib/triage/state.json";

const mcpServers = {
  linear: {
    type: "http" as const,
    url: "https://mcp.linear.app/sse",
    headers: { Authorization: `Bearer ${process.env.LINEAR_API_KEY!}` },
  },
};

async function main() {
  const state = await readState();

  await using agent = state.agentId
    ? Agent.resume(state.agentId, {
        apiKey: process.env.CURSOR_API_KEY!,
        model: { id: "composer-2" },
        cloud: { repos: [{ url: process.env.REPO_URL!, startingRef: "main" }] },
        mcpServers, // must re-pass on resume
      })
    : Agent.create({
        apiKey: process.env.CURSOR_API_KEY!,
        model: { id: "composer-2" },
        cloud: { repos: [{ url: process.env.REPO_URL!, startingRef: "main" }] },
        mcpServers,
      });

  console.log(`[triage] agent=${agent.agentId}`);

  try {
    const run = await agent.send(
      "Triage new Linear tickets opened in the last 24h. Label, assign, comment with next steps."
    );
    const result = await run.wait();
    if (result.status === "error") {
      console.error(`[triage] run ${result.id} errored`);
    }
    await writeState({ agentId: agent.agentId, lastRunId: result.id });
  } catch (err) {
    if (err instanceof CursorAgentError && err.isRetryable) {
      console.error(`[triage] transient: ${err.message}, will retry next tick`);
      return;
    }
    throw err;
  }
}

async function readState(): Promise<{ agentId?: string; lastRunId?: string }> {
  try { return JSON.parse(await readFile(STATE_PATH, "utf-8")); }
  catch { return {}; }
}
async function writeState(s: { agentId: string; lastRunId: string }) {
  await writeFile(STATE_PATH, JSON.stringify(s));
}

main();
```

Why this shape:

- Persisted `agentId` across cron invocations keeps conversation memory (e.g., "remember which tickets we already triaged yesterday").
- MCP re-passed on every resume.
- Graceful on retryable errors: skip this tick, try next.

---

## 3. One-shot analysis script

Goal: dev runs a command against a local repo and gets a written analysis.

```typescript
#!/usr/bin/env node
import { Agent } from "@cursor/sdk";

const prompt = process.argv.slice(2).join(" ").trim();
if (!prompt) {
  console.error("Usage: analyze.ts <question>");
  process.exit(1);
}

const result = await Agent.prompt(prompt, {
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
});

console.log(result.result ?? "(no output)");
process.exit(result.status === "finished" ? 0 : 2);
```

Why this shape:

- `Agent.prompt` disposes for you. Perfect for throwaway CLIs.
- No streaming — it's a one-shot.
- Exit code carries status; use in shell pipelines (`&&`, `|| fallback`).

---

## 4. Backend service: user-scoped agents behind an HTTP API

Goal: your backend service exposes an endpoint that runs a Cursor agent on a user's behalf. Each user has their own durable agent.

```typescript
import express from "express";
import { Agent, CursorAgentError } from "@cursor/sdk";

const app = express();
app.use(express.json());

// Pretend this lives in your DB
const userAgents = new Map<string, string>();

app.post("/agents/:userId/send", async (req, res) => {
  const { userId } = req.params;
  const { prompt } = req.body;
  const apiKey = process.env.CURSOR_SERVICE_ACCOUNT_KEY!;

  const existing = userAgents.get(userId);
  const options = {
    apiKey,
    model: { id: "composer-2" as const },
    cloud: { repos: [{ url: "https://github.com/your-org/workspace", startingRef: "main" }] },
  };

  try {
    await using agent = existing
      ? Agent.resume(existing, options)
      : Agent.create(options);

    const run = await agent.send(prompt);
    const result = await run.wait();

    userAgents.set(userId, agent.agentId);
    res.json({
      agentId: agent.agentId,
      runId: result.id,
      status: result.status,
      durationMs: result.durationMs,
    });
  } catch (err) {
    if (err instanceof CursorAgentError) {
      res.status(err.code === undefined ? 500 : 502).json({
        error: err.constructor.name,
        message: err.message,
        retryable: err.isRetryable,
      });
      return;
    }
    res.status(500).json({ error: "internal" });
  }
});

app.listen(3000);
```

Why this shape:

- Service-account key, not user keys — this is shared infrastructure.
- `await using` per request; no lingering agent handles between requests.
- `userAgents` is a stand-in for your database; persist `agentId` per user for resume.
- Error surface passes `isRetryable` through so callers can back off intelligently.

Don't do this if you need response streaming to the client — switch to `run.stream()` into a server-sent-events endpoint.

---

## 5. Fan-out: run an agent against many repos in parallel

Goal: spin off a cloud agent per repo in a list, collect results.

```typescript
import { Agent, CursorAgentError } from "@cursor/sdk";

async function dispatchOne(repoUrl: string, apiKey: string, prompt: string) {
  await using agent = Agent.create({
    apiKey,
    model: { id: "composer-2" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: "main" }],
      autoCreatePR: false,
      skipReviewerRequest: true,
    },
  });
  try {
    const run = await agent.send(prompt);
    const result = await run.wait();
    return { repoUrl, agentId: agent.agentId, status: result.status, runId: result.id };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return { repoUrl, error: err.constructor.name, message: err.message };
    }
    throw err;
  }
}

const repos = [
  "https://github.com/your-org/service-a",
  "https://github.com/your-org/service-b",
  "https://github.com/your-org/service-c",
];

const prompt = "Audit Dockerfile for outdated base images. Propose an update.";
const apiKey = process.env.CURSOR_API_KEY!;

const results = await Promise.allSettled(repos.map(r => dispatchOne(r, apiKey, prompt)));
console.log(JSON.stringify(results, null, 2));
```

Why this shape:

- `Promise.allSettled` — one repo failing doesn't torpedo the others.
- Cloud runtime because cloud agents are actually independent VMs; local fan-out would serialize through the caller's machine.
- Per-agent `await using` so each completes cleanup even when others are still running.
- `autoCreatePR: false` because we want to review results first; run a follow-up to open PRs once you've picked which ones pass the audit.

**Rate-limit awareness**: fanning out 100 agents at once will hit backend limits. For large N, batch:

```typescript
async function runInBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    results.push(...await Promise.all(batch.map(fn)));
  }
  return results;
}
```

---

## Cross-cutting best practices

Applied to all five patterns:

- **Log `agent.agentId` and `run.id` before the stream.** Every failure investigation starts from those two IDs.
- **Distinguish exit/response codes by failure type.** Your ops team should be able to tell "couldn't authenticate" from "agent did work and it went wrong" at a glance.
- **Respect `isRetryable`.** Back off on transient, don't retry on terminal. Blind retries on a failed cloud run spawn duplicate PRs.
- **`await using` or explicit `finally`.** Every `Agent.create` / `Agent.resume` needs an unambiguous disposal path.
- **Pass `apiKey` explicitly.** Don't rely on ambient env in shared infrastructure code.
- **Don't commit `CURSOR_API_KEY`.** Don't log it. Prefix-only (`cursor_01ab...`) when you need to confirm which key is in use.


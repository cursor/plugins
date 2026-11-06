import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A run whose SSE has died: `stream()` never yields again and never ends, and
// `wait()` (which rides the same stream) never settles. The REST side has
// already moved the run to `finished`, which is what the watchdog poll sees.

const SDK_MOCK = "@cursor/sdk";

const finishedResult = {
  id: "run-dead-sse",
  status: "finished" as const,
  result: "## Status\nhanded-off\n\n## Branch\nagent/worker-one\n",
  durationMs: 10_000,
  git: { branches: [{ branch: "agent/worker-one" }] },
};

const never = () => new Promise<never>(() => {});

function deadStreamRun(status: "running" | "finished") {
  return {
    id: "run-dead-sse",
    agentId: "bc-dead-sse",
    status,
    stream: async function* () {
      yield {
        type: "assistant",
        message: { content: [{ type: "text", text: "working..." }] },
      };
      await never();
    },
    wait: status === "finished" ? async () => finishedResult : never,
  };
}

mock.module(SDK_MOCK, () => ({
  Agent: {
    create: async () => ({
      agentId: "bc-dead-sse",
      send: async () => deadStreamRun("running"),
      [Symbol.asyncDispose]: () => Promise.resolve(),
    }),
    // The poll sees the server-side truth.
    getRun: async () => deadStreamRun("finished"),
  },
  CursorAgentError: class CursorAgentError extends Error {},
}));

const { AgentManager, __resetSDKForTests } = await import(
  "../core/agent-manager.ts"
);
__resetSDKForTests();

const ORIGINAL_API_KEY = process.env.CURSOR_API_KEY;
const ORIGINAL_POLL = process.env.ORCHESTRATE_WATCHDOG_POLL_MS;

beforeAll(() => {
  process.env.CURSOR_API_KEY = "test-key";
  process.env.ORCHESTRATE_WATCHDOG_POLL_MS = "50";
});

afterAll(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = ORIGINAL_API_KEY;
  if (ORIGINAL_POLL === undefined)
    delete process.env.ORCHESTRATE_WATCHDOG_POLL_MS;
  else process.env.ORCHESTRATE_WATCHDOG_POLL_MS = ORIGINAL_POLL;
});

describe("waitAndHandoff with a dead SSE stream", () => {
  test("Hands the task off from the watchdog's result instead of waiting on the stream forever", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-dead-sse-"));
    writeFileSync(
      join(workspace, "plan.json"),
      JSON.stringify({
        goal: "survive a dead stream",
        rootSlug: "dead-sse",
        baseBranch: "main",
        repoUrl: "https://github.com/example-org/example-repo",
        tasks: [
          { name: "worker-one", type: "worker", scopedGoal: "Do the work." },
        ],
      })
    );
    try {
      const mgr = await AgentManager.load(workspace);
      const def = mgr.plan.tasks?.find(t => t.name === "worker-one");
      if (!def) throw new Error("missing task def");
      const spawned = await mgr.spawnTask(def);
      if (!spawned) throw new Error("spawn failed");

      const outcome = await Promise.race([
        mgr.waitAndHandoff(spawned).then(() => "handed-off" as const),
        new Promise<"hung">(resolve =>
          setTimeout(() => resolve("hung"), 8_000)
        ),
      ]);

      expect(outcome).toBe("handed-off");
      expect(mgr.getTask("worker-one")?.status).toBe("handed-off");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 15_000);
});

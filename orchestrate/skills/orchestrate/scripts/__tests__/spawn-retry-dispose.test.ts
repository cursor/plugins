import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SDK_MOCK = "@cursor/sdk";

interface FakeAgent {
  agentId: string;
  disposed: boolean;
  send: () => Promise<{ id: string }>;
  [Symbol.asyncDispose]: () => Promise<void>;
}

const created: FakeAgent[] = [];
let sends = 0;

mock.module(SDK_MOCK, () => ({
  Agent: {
    create: async () => {
      const agent: FakeAgent = {
        agentId: `bc-${created.length + 1}`,
        disposed: false,
        send: async () => {
          sends += 1;
          if (sends === 1) throw new Error("fetch failed: ECONNRESET");
          return { id: "run-ok" };
        },
        [Symbol.asyncDispose]: async () => {
          agent.disposed = true;
        },
      };
      created.push(agent);
      return agent;
    },
    getRun: async () => {
      throw new Error("unused");
    },
  },
  CursorAgentError: class CursorAgentError extends Error {},
}));

const { AgentManager, __resetSDKForTests } = await import(
  "../core/agent-manager.ts"
);
__resetSDKForTests();

const ORIGINAL_API_KEY = process.env.CURSOR_API_KEY;
beforeAll(() => {
  process.env.CURSOR_API_KEY = "test-key";
});
afterAll(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = ORIGINAL_API_KEY;
});

test("a failed send disposes the cloud agent before the retry creates another", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "orch-spawn-dispose-"));
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify({
      goal: "prove spawn retry closes the first agent",
      rootSlug: "spawn-dispose",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [
        {
          name: "flaky-worker",
          type: "worker",
          scopedGoal: "Retry once.",
        },
      ],
    })
  );
  try {
    const mgr = await AgentManager.load(workspace);
    const def = mgr.plan.tasks?.find(t => t.name === "flaky-worker");
    if (!def) throw new Error("missing task def");
    const spawned = await mgr.spawnTask(def);
    expect(spawned?.agent.agentId).toBe("bc-2");
    expect(created.map(agent => agent.agentId)).toEqual(["bc-1", "bc-2"]);
    expect(created[0]?.disposed).toBe(true);
    expect(created[1]?.disposed).toBe(false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

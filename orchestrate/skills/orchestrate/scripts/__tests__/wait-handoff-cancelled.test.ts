import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SDK_MOCK = "@cursor/sdk";

interface FakeRunResult {
  id: string;
  status: "finished" | "error" | "cancelled";
  result?: string;
  durationMs?: number;
  git?: { branches: Array<{ branch?: string | null }> };
}

let currentResult: FakeRunResult | null = null;

function makeFakeRun(rr: FakeRunResult) {
  return {
    id: rr.id,
    agentId: "bc-killed",
    status: rr.status,
    stream: async function* () {},
    wait: async () => rr,
  };
}

mock.module(SDK_MOCK, () => ({
  Agent: {
    create: async () => {
      if (!currentResult) throw new Error("SDK mock: set currentResult first");
      const rr = currentResult;
      return {
        agentId: "bc-killed",
        send: async () => makeFakeRun(rr),
        [Symbol.asyncDispose]: () => Promise.resolve(),
      };
    },
    getRun: async () => {
      if (!currentResult) throw new Error("SDK mock: set currentResult first");
      return makeFakeRun(currentResult);
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

afterEach(() => {
  currentResult = null;
});

function workspaceWithRunningWorker(): string {
  const workspace = mkdtempSync(join(tmpdir(), "orch-cancelled-"));
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify({
      goal: "stop a worker",
      rootSlug: "cancel-test",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [{ name: "killed-worker", type: "worker", scopedGoal: "Work." }],
    })
  );
  writeFileSync(
    join(workspace, "state.json"),
    JSON.stringify({
      rootSlug: "cancel-test",
      attention: [],
      tasks: [
        {
          name: "killed-worker",
          type: "worker",
          branch: "orch/cancel-test/killed-worker",
          startingRef: "main",
          dependsOn: [],
          agentId: "bc-killed",
          runId: "run-killed",
          parentAgentId: null,
          status: "running",
          resultStatus: null,
          handoffPath: null,
          startedAt: "2026-04-30T00:00:00.000Z",
          finishedAt: null,
          lastUpdate: "2026-04-30T00:01:00.000Z",
          note: null,
          slackTs: null,
        },
      ],
    })
  );
  return workspace;
}

const cancelledRun: FakeRunResult = {
  id: "run-killed",
  status: "cancelled",
  result: "",
  durationMs: 30_000,
  git: { branches: [] },
};

describe("waitAndHandoff on a cancelled run", () => {
  test("Reconcile after kill-tree records cancelled, not error", async () => {
    const workspace = workspaceWithRunningWorker();
    currentResult = cancelledRun;
    try {
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("killed-worker");
      if (!task) throw new Error("missing task");
      const rec = await mgr.recoverRunning(task);
      if (!rec) throw new Error("recover returned null");
      await mgr.waitAndHandoff(rec);

      const after = mgr.getTask("killed-worker");
      expect(after?.status).toBe("cancelled");
      expect(after?.resultStatus).toBe("cancelled");
      expect(after?.failureMode).toBeNull();
      expect(
        existsSync(join(workspace, "handoffs", "killed-worker-failure.md"))
      ).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("An in-flight wait does not overwrite an operator cancel with error", async () => {
    const workspace = workspaceWithRunningWorker();
    currentResult = { ...cancelledRun, id: "run-fresh" };
    try {
      const mgr = await AgentManager.load(workspace);
      const def = mgr.plan.tasks?.find(t => t.name === "killed-worker");
      const task = mgr.getTask("killed-worker");
      if (!def || !task) throw new Error("missing task");
      mgr.touch(task, { status: "pending" });
      const spawned = await mgr.spawnTask(def);
      if (!spawned) throw new Error("spawn failed");
      await mgr.waitAndHandoff(spawned);

      expect(mgr.getTask("killed-worker")?.status).toBe("cancelled");
      expect(
        mgr.state.attention.some(a =>
          a.message.startsWith("killed-worker: run ended with status=")
        )
      ).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

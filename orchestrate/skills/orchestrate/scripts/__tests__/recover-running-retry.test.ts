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

let getRunFailures = 0;
let getRunCalls = 0;

function liveRun() {
  return {
    id: "run-live",
    agentId: "bc-live",
    status: "running",
    stream: async function* () {},
    wait: async () => ({
      id: "run-live",
      status: "finished",
      result: "## Status\nsuccess\n",
      git: { branches: [] },
    }),
  };
}

mock.module(SDK_MOCK, () => ({
  Agent: {
    create: async () => {
      throw new Error("SDK mock: create not expected");
    },
    getRun: async () => {
      getRunCalls++;
      if (getRunCalls <= getRunFailures) {
        throw new Error("fetch failed: ECONNRESET");
      }
      return liveRun();
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
  getRunFailures = 0;
  getRunCalls = 0;
});

function workspaceWithRunningWorker(): string {
  const workspace = mkdtempSync(join(tmpdir(), "orch-recover-retry-"));
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify({
      goal: "survive a restart",
      rootSlug: "recover-test",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [{ name: "live-worker", type: "worker", scopedGoal: "Work." }],
    })
  );
  writeFileSync(
    join(workspace, "state.json"),
    JSON.stringify({
      rootSlug: "recover-test",
      attention: [],
      tasks: [
        {
          name: "live-worker",
          type: "worker",
          branch: "orch/recover-test/live-worker",
          startingRef: "main",
          dependsOn: [],
          agentId: "bc-live",
          runId: "run-live",
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

describe("recoverRunning", () => {
  test("A transient lookup failure on restart still reattaches the live run", async () => {
    const workspace = workspaceWithRunningWorker();
    getRunFailures = 1;
    try {
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("live-worker");
      if (!task) throw new Error("missing task");
      const rec = await mgr.recoverRunning(task);

      expect(rec?.kind).toBe("recovered");
      expect(mgr.getTask("live-worker")?.status).toBe("running");
      expect(
        existsSync(join(workspace, "handoffs", "live-worker-failure.md"))
      ).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("A lookup that keeps failing still marks the task error", async () => {
    const workspace = workspaceWithRunningWorker();
    getRunFailures = Number.POSITIVE_INFINITY;
    try {
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("live-worker");
      if (!task) throw new Error("missing task");
      const rec = await mgr.recoverRunning(task);

      expect(rec).toBeNull();
      expect(mgr.getTask("live-worker")?.status).toBe("error");
      expect(
        existsSync(join(workspace, "handoffs", "live-worker-failure.md"))
      ).toBe(true);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 15_000);
});

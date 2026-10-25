import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SDK_MOCK = "@cursor/sdk";

mock.module(SDK_MOCK, () => ({
  Agent: {
    getRun: async () => ({
      cancel: async () => {
        throw new Error("backend unavailable");
      },
    }),
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

test("stopTask does not report a worker cancelled when backend cancellation fails", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "orch-stop-cancel-failure-"));
  try {
    writeFileSync(
      join(workspace, "plan.json"),
      JSON.stringify({
        goal: "stop a worker",
        rootSlug: "stop-worker",
        baseBranch: "main",
        repoUrl: "https://github.com/example-org/example-repo",
        tasks: [{ name: "worker", type: "worker", scopedGoal: "Work." }],
      })
    );
    const mgr = await AgentManager.load(workspace);
    const task = mgr.getTask("worker");
    if (!task) throw new Error("missing worker");
    mgr.touch(task, {
      status: "running",
      agentId: "agent-1",
      runId: "run-1",
    });

    const result = await mgr.stopTask("worker");

    expect(result.action).toBe("cancel-failed");
    expect(mgr.getTask("worker")?.status).toBe("error");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

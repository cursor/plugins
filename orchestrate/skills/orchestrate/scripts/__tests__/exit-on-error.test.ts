import { describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AgentManager } from "../core/agent-manager.ts";
import { EXIT_ON_ERROR_EXIT_CODE, runOrchestrateLoop } from "../core/loop.ts";
import type { TaskState } from "../schemas.ts";

function runningTask(name: string): TaskState {
  return {
    name,
    type: "worker",
    branch: `orch/exit-on-error/${name}`,
    startingRef: "main",
    dependsOn: [],
    agentId: `agent-${name}`,
    runId: `run-${name}`,
    parentAgentId: null,
    status: "running",
    resultStatus: null,
    handoffPath: null,
    startedAt: new Date(0).toISOString(),
    finishedAt: null,
    lastUpdate: new Date(0).toISOString(),
    note: null,
    slackTs: null,
    prNumber: null,
    failureMode: null,
    verification: null,
  };
}

function buildManagerStub(args: {
  workspace: string;
  tasks: TaskState[];
  syncedReasons: string[];
  onRecover?: (task: TaskState) => TaskState;
}): AgentManager {
  return {
    workspace: args.workspace,
    handoffsDir: join(args.workspace, "handoffs"),
    attentionLog: join(args.workspace, "attention.log"),
    plan: {
      goal: "exit on error",
      rootSlug: "exit-on-error",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [],
    },
    state: { rootSlug: "exit-on-error", tasks: args.tasks, attention: [] },
    tasks: args.tasks,
    commentDestinations: () => ({}),
    andon: {
      drainEvents: async () => {},
      isActive: () => false,
      noteSpawnPaused: () => {},
    },
    getTask: (name: string) => args.tasks.find(t => t.name === name),
    recoverRunning: async (task: TaskState) => {
      if (args.onRecover) args.onRecover(task);
      return null;
    },
    waitAndHandoff: async () => {},
    spawnTask: async () => null,
    depsSatisfied: () => false,
    savePlan: () => {},
    saveState: () => {},
    logAttention: () => {},
    syncStateToGit: (reason: string) => {
      args.syncedReasons.push(reason);
    },
  } as unknown as AgentManager;
}

describe("exit-on-error", () => {
  test("Returns early when a task transitions to error this run", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-exit-on-error-"));
    const stderr = spyOn(console, "error").mockImplementation(() => {});
    const tasks = [runningTask("crashy")];
    const syncedReasons: string[] = [];

    try {
      const mgr = buildManagerStub({
        workspace,
        tasks,
        syncedReasons,
        onRecover: task => {
          task.status = "error";
          task.note = "simulated crash";
          return task;
        },
      });

      const code = await runOrchestrateLoop(mgr, {
        maxRuntimeSec: 60,
        sleep: async () => {},
      });

      expect(code).toBe(EXIT_ON_ERROR_EXIT_CODE);
      expect(syncedReasons).toEqual(["exit-on-error: crashy"]);
      const messages = stderr.mock.calls.map(call => String(call[0]));
      expect(messages.some(m => m.includes("exit-on-error"))).toBe(true);
      expect(messages.some(m => m.includes("(crashy)"))).toBe(true);
    } finally {
      stderr.mockRestore();
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  // syncStateToGit("exit-on-error: ...") is the unambiguous marker for
  // the short-circuit path; computeLoopExitCode returns 1 for any
  // terminal error, so the exit code alone can't distinguish them.
  test("Pre-existing error does not trigger exit-on-error", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-exit-preexisting-"));
    const tasks: TaskState[] = [
      {
        ...runningTask("ghost"),
        agentId: null,
        runId: null,
        status: "error",
        note: "pre-existing error from a prior run",
      },
    ];
    const syncedReasons: string[] = [];

    try {
      const mgr = buildManagerStub({ workspace, tasks, syncedReasons });
      await runOrchestrateLoop(mgr, {
        maxRuntimeSec: 60,
        sleep: async () => {},
      });

      expect(syncedReasons.some(r => r.startsWith("exit-on-error:"))).toBe(
        false
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("exitOnError:false keeps draining past errors", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-exit-all-done-"));
    const tasks = [runningTask("crashy")];
    const syncedReasons: string[] = [];

    try {
      const mgr = buildManagerStub({
        workspace,
        tasks,
        syncedReasons,
        onRecover: task => {
          task.status = "error";
          return task;
        },
      });

      await runOrchestrateLoop(mgr, {
        maxRuntimeSec: 60,
        sleep: async () => {},
        exitOnError: false,
      });

      expect(syncedReasons.some(r => r.startsWith("exit-on-error:"))).toBe(
        false
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

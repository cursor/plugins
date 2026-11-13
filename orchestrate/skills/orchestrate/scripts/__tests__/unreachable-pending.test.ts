import { describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AgentManager } from "../core/agent-manager.ts";
import { runOrchestrateLoop } from "../core/loop.ts";
import type { TaskState } from "../schemas.ts";

function task(
  name: string,
  status: TaskState["status"],
  dependsOn: string[]
): TaskState {
  return {
    name,
    type: "worker",
    branch: `orch/blocked/${name}`,
    startingRef: "main",
    dependsOn,
    agentId: null,
    runId: null,
    parentAgentId: null,
    status,
    resultStatus: null,
    handoffPath: null,
    startedAt: null,
    finishedAt: null,
    lastUpdate: null,
    note: null,
    slackTs: null,
    prNumber: null,
    failureMode: null,
    verification: null,
  };
}

describe("unreachable pending tasks", () => {
  test("Flags tasks blocked through an intermediate pending task", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-unreachable-"));
    const tasks = [
      task("broken", "error", []),
      task("middle", "pending", ["broken"]),
      task("downstream", "pending", ["middle"]),
    ];
    const attention: string[] = [];
    const log = spyOn(console, "log").mockImplementation(() => {});
    const mgr = {
      workspace,
      handoffsDir: join(workspace, "handoffs"),
      attentionLog: join(workspace, "attention.log"),
      plan: {
        goal: "show the blast radius",
        rootSlug: "blocked",
        baseBranch: "main",
        repoUrl: "https://github.com/example-org/example-repo",
        tasks: tasks.map(t => ({
          name: t.name,
          type: "worker" as const,
          scopedGoal: "work",
          dependsOn: t.dependsOn,
        })),
      },
      state: { rootSlug: "blocked", tasks, attention: [] },
      tasks,
      commentDestinations: () => ({}),
      andon: {
        drainEvents: async () => {},
        isActive: () => false,
        noteSpawnPaused: () => {},
        clearedDuringLoop: false,
      },
      getTask: (name: string) => tasks.find(t => t.name === name),
      recoverRunning: async () => null,
      waitAndHandoff: async () => {},
      spawnTask: async () => null,
      depsSatisfied: () => false,
      savePlan: () => {},
      saveState: () => {},
      logAttention: (line: string) => {
        attention.push(line);
      },
      syncStateToGit: () => {},
    } as unknown as AgentManager;

    try {
      const code = await runOrchestrateLoop(mgr, {
        maxRuntimeSec: 30,
        exitOnError: false,
        sleep: async () => {
          throw new Error("loop should stop; nothing can still spawn");
        },
      });

      expect(code).toBe(1);
      expect(attention.some(line => line.startsWith("middle:"))).toBe(true);
      expect(
        attention.some(
          line =>
            line.startsWith("downstream:") && line.includes("broken (error)")
        )
      ).toBe(true);
    } finally {
      log.mockRestore();
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

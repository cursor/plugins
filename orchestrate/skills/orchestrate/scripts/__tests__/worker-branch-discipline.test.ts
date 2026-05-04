import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AgentManager } from "../core/agent-manager.ts";
import {
  mergeWorkerSourceBranches,
  mergeWorkerTargetBranch,
  plannedBranchForTask,
} from "../core/branches.ts";
import { buildWorkerPrompt } from "../core/prompts.ts";
import type { Plan, PlanTask, TaskState } from "../schemas.ts";

describe("worker branch discipline", () => {
  test("workers must use the per-task branch", async () => {
    const workspace = writeWorkspace(planFixture());
    const priorApiKey = process.env.CURSOR_API_KEY;
    process.env.CURSOR_API_KEY = "test-key";
    try {
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("worker-one");
      if (!task) throw new Error("worker-one missing");

      expect(mgr.branchForTask(task)).toBe("orch/refactor-ui/worker-one");

      mgr.touch(task, { branch: "orch/refactor-ui/slice-a" });
      expect(() => mgr.branchForTask(task)).toThrow(
        "worker-one: branch must be orch/refactor-ui/worker-one, got orch/refactor-ui/slice-a"
      );
    } finally {
      if (priorApiKey === undefined) {
        delete process.env.CURSOR_API_KEY;
      } else {
        process.env.CURSOR_API_KEY = priorApiKey;
      }
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("merge workers serialize dependency branches into one slice", () => {
    const plan = planFixture();
    const mergeTask = requireTask(plan, "merge-slice-a");

    expect(mergeWorkerTargetBranch(plan, mergeTask)).toBe(
      "orch/refactor-ui/slice-a"
    );
    expect(mergeWorkerSourceBranches(plan, mergeTask)).toEqual([
      "orch/refactor-ui/worker-one",
      "orch/refactor-ui/worker-two",
    ]);
  });

  test("worker prompt names the only branch a normal worker may push", () => {
    const plan = planFixture();
    const task = requireTask(plan, "worker-one");
    const prompt = buildWorkerPrompt(task, "bc-worker", promptContext(plan));

    expect(prompt).toContain("Push exactly `orch/refactor-ui/worker-one`");
  });

  test("merge worker prompt lists source branches in dependency order", () => {
    const plan = planFixture();
    const task = requireTask(plan, "merge-slice-a");
    const prompt = buildWorkerPrompt(task, "bc-merge", promptContext(plan));

    expect(prompt).toContain("This is a merge worker for slice `slice-a`");
    expect(prompt).toContain(
      "Merge dependency branches into `orch/refactor-ui/slice-a` one at a time"
    );
    expect(prompt.indexOf("orch/refactor-ui/worker-one")).toBeLessThan(
      prompt.indexOf("orch/refactor-ui/worker-two")
    );
  });
});

function planFixture(): Plan {
  return {
    goal: "merge worker test",
    rootSlug: "refactor-ui",
    baseBranch: "main",
    repoUrl: "https://github.com/example-org/example-repo",
    syncStateToGit: false,
    tasks: [
      {
        name: "worker-one",
        type: "worker",
        scopedGoal: "Do one.",
      },
      {
        name: "worker-two",
        type: "worker",
        scopedGoal: "Do two.",
      },
      {
        name: "merge-slice-a",
        type: "worker",
        scopedGoal: "Merge accepted worker branches into slice-a.",
        dependsOn: ["worker-one", "worker-two"],
      },
    ],
  };
}

function writeWorkspace(plan: Plan): string {
  const workspace = mkdtempSync(join(tmpdir(), "orch-worker-branches-"));
  writeFileSync(join(workspace, "plan.json"), JSON.stringify(plan, null, 2));
  return workspace;
}

function requireTask(plan: Plan, name: string): PlanTask {
  const task = (plan.tasks ?? []).find(task => task.name === name);
  if (!task) throw new Error(`${name} missing`);
  return task;
}

function promptContext(plan: Plan) {
  return {
    plan,
    branchForTask: (task: PlanTask | TaskState) =>
      plannedBranchForTask(plan, task),
    getTask: () => undefined,
    readHandoff: () => null,
  };
}

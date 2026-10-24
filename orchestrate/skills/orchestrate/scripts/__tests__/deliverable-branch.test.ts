import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AgentManager } from "../core/agent-manager.ts";

const REPO_URL = "https://github.com/example-org/example-repo";
const ORIGINAL_API_KEY = process.env.CURSOR_API_KEY;
process.env.CURSOR_API_KEY = "test-key";

afterAll(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = ORIGINAL_API_KEY;
});

const plan = {
  goal: "ship a slice",
  rootSlug: "ship-slice",
  baseBranch: "main",
  repoUrl: REPO_URL,
  syncStateToGit: false,
  tasks: [
    {
      name: "frontend-toggle",
      type: "worker",
      scopedGoal: "Add the toggle.",
    },
    {
      name: "slice-planner",
      type: "subplanner",
      scopedGoal: "Own the slice.",
    },
    {
      name: "verify-frontend-toggle",
      type: "verifier",
      verifies: "frontend-toggle",
      scopedGoal: "Verify the toggle.",
    },
  ],
};

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-deliverable-branch-"));
  writeFileSync(join(dir, "plan.json"), JSON.stringify(plan, null, 2));
  return dir;
}

describe("recorded deliverable branches", () => {
  test("Downstream lookups keep a handed-off branch that is not the placeholder", async () => {
    const dir = workspace();
    try {
      const mgr = await AgentManager.load(dir);
      const worker = mgr.getTask("frontend-toggle");
      if (!worker) throw new Error("missing worker");
      const deliverable = "agent/frontend-toggle-abcdef";
      mgr.touch(worker, {
        status: "handed-off",
        branch: deliverable,
        prNumber: 1,
      });

      expect(mgr.branchForTask(worker)).toBe(deliverable);
      const planWorker = (mgr.plan.tasks ?? []).find(
        task => task.name === "frontend-toggle"
      );
      if (!planWorker) throw new Error("missing plan worker");
      // Verifier spawn resolves the target through the plan task, not state.
      expect(mgr.branchForTask(planWorker)).toBe(deliverable);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("Pending workers still reject a branch other than the planned one", async () => {
    const dir = workspace();
    try {
      const mgr = await AgentManager.load(dir);
      const worker = mgr.getTask("frontend-toggle");
      if (!worker) throw new Error("missing worker");
      mgr.touch(worker, { branch: "orch/ship-slice/someone-else" });
      expect(() => mgr.branchForTask(worker)).toThrow(
        "frontend-toggle: branch must be orch/ship-slice/frontend-toggle, got orch/ship-slice/someone-else"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("Respawn puts the bookkeeping branch back so the next spawn can build a prompt", async () => {
    const dir = workspace();
    try {
      const mgr = await AgentManager.load(dir);
      const sub = mgr.getTask("slice-planner");
      if (!sub) throw new Error("missing subplanner");
      const cloudBranch = "cursor/slice-planner-abc123";
      mgr.touch(sub, {
        status: "error",
        branch: cloudBranch,
        attempts: 1,
        startingRef: "main",
      });

      const respawned = mgr.respawnTask("slice-planner");
      expect(respawned.status).toBe("pending");
      expect(respawned.branch).toBe("orch/ship-slice/slice-planner");
      expect(respawned.startingRef).toBe(cloudBranch);
      expect(mgr.branchForTask(respawned)).toBe(
        "orch/ship-slice/slice-planner"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AgentManager } from "../core/agent-manager.ts";
import { parseHandoffBranch } from "../core/handoff.ts";
import type { State } from "../schemas.ts";

const REPO_URL = "https://github.com/example-org/example-repo";

function makeWorkspace(args: { plan: unknown; state?: unknown }): string {
  const workspace = mkdtempSync(join(tmpdir(), "orch-reconcile-"));
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify(args.plan, null, 2)
  );
  if (args.state !== undefined) {
    writeFileSync(
      join(workspace, "state.json"),
      JSON.stringify(args.state, null, 2)
    );
  }
  return workspace;
}

function readState(workspace: string): State {
  return JSON.parse(readFileSync(join(workspace, "state.json"), "utf8"));
}

function readAttentionLog(workspace: string): string {
  try {
    return readFileSync(join(workspace, "attention.log"), "utf8");
  } catch {
    return "";
  }
}

function requireTask(
  task: State["tasks"][number] | undefined,
  name: string
): State["tasks"][number] {
  if (!task) throw new Error(`missing task: ${name}`);
  return task;
}

const baselinePlan = {
  goal: "ship a refactor",
  rootSlug: "ship-refactor",
  baseBranch: "main",
  repoUrl: REPO_URL,
  tasks: [
    {
      name: "frontend-toggle",
      type: "worker",
      scopedGoal: "Add the toggle.",
    },
    {
      name: "verify-frontend-toggle",
      type: "verifier",
      verifies: "frontend-toggle",
      scopedGoal: "Verify the toggle.",
    },
  ],
} as const;

const ORIGINAL_API_KEY = process.env.CURSOR_API_KEY;
process.env.CURSOR_API_KEY = "test-key";

afterAll(() => {
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.CURSOR_API_KEY;
  } else {
    process.env.CURSOR_API_KEY = ORIGINAL_API_KEY;
  }
});

describe("AgentManager.reconcileVerifierStartingRefs", () => {
  test("Reconciles verifier startingRef after worker handoff", async () => {
    const workspace = makeWorkspace({ plan: baselinePlan });
    try {
      const mgr = await AgentManager.load(workspace);
      const worker = requireTask(
        mgr.getTask("frontend-toggle"),
        "frontend-toggle"
      );
      const verifier = requireTask(
        mgr.getTask("verify-frontend-toggle"),
        "verify-frontend-toggle"
      );
      expect(verifier.startingRef).toBe("orch/ship-refactor/frontend-toggle");

      const actualBranch = "agent/frontend-toggle-abcdef";
      mgr.touch(worker, { branch: actualBranch, status: "handed-off" });
      mgr.reconcileVerifierStartingRefs({
        updatedName: "frontend-toggle",
        newBranch: actualBranch,
      });

      expect(mgr.getTask("verify-frontend-toggle")?.startingRef).toBe(
        actualBranch
      );
      const persisted = readState(workspace);
      expect(
        persisted.tasks.find(t => t.name === "verify-frontend-toggle")
          ?.startingRef
      ).toBe(actualBranch);
      const attention = readAttentionLog(workspace);
      expect(attention).toMatch(
        /verify-frontend-toggle: startingRef reconciled/
      );
      expect(attention).toMatch(/agent\/frontend-toggle-abcdef/);

      // Idempotent: re-running should not flip the value or emit a duplicate
      // attention entry.
      const beforeCount = (attention.match(/startingRef reconciled/g) ?? [])
        .length;
      mgr.reconcileVerifierStartingRefs({
        updatedName: "frontend-toggle",
        newBranch: actualBranch,
      });
      const afterCount = (
        readAttentionLog(workspace).match(/startingRef reconciled/g) ?? []
      ).length;
      expect(afterCount).toBe(beforeCount);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Planner-authored startingRef wins", async () => {
    const planWithOverride = {
      ...baselinePlan,
      tasks: [
        baselinePlan.tasks[0],
        {
          ...baselinePlan.tasks[1],
          startingRef: "orch/ship-refactor/release-train",
        },
      ],
    };
    const workspace = makeWorkspace({ plan: planWithOverride });
    try {
      const mgr = await AgentManager.load(workspace);
      const verifier = requireTask(
        mgr.getTask("verify-frontend-toggle"),
        "verify-frontend-toggle"
      );
      expect(verifier.startingRef).toBe("orch/ship-refactor/release-train");

      mgr.reconcileVerifierStartingRefs({
        updatedName: "frontend-toggle",
        newBranch: "agent/frontend-toggle-abcdef",
      });

      expect(mgr.getTask("verify-frontend-toggle")?.startingRef).toBe(
        "orch/ship-refactor/release-train"
      );
      expect(readAttentionLog(workspace)).not.toMatch(
        /verify-frontend-toggle: startingRef reconciled/
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Handoff body branch reconciles verifier startingRef", async () => {
    const workspace = makeWorkspace({ plan: baselinePlan });
    try {
      const mgr = await AgentManager.load(workspace);
      const worker = requireTask(
        mgr.getTask("frontend-toggle"),
        "frontend-toggle"
      );
      const placeholder = "orch/ship-refactor/frontend-toggle";
      expect(worker.branch).toBe(placeholder);

      const handoffBody = [
        "## Status",
        "success",
        "## Branch",
        "`agent/foo-abc1`",
        "## What I did",
        "- shipped",
        "## Measurements",
        "(none)",
      ].join("\n");

      // Pre-fix replay: with `firstRunBranch(rr)` empty (the SDK behavior
      // for worker runs), the OLD precedence rule fell back to s.branch
      // (still the placeholder) and the reconcile guard short-circuited.
      // Document the broken behavior so a future revert reads as red.
      mgr.reconcileVerifierStartingRefs({
        updatedName: "frontend-toggle",
        newBranch: placeholder,
      });
      expect(mgr.getTask("verify-frontend-toggle")?.startingRef).toBe(
        placeholder
      );

      // Post-fix flow: parseHandoffBranch(body) wins over an empty
      // firstRunBranch(rr), so reconcile sees the actual pushed branch.
      const parsed = parseHandoffBranch(handoffBody);
      expect(parsed).toBe("agent/foo-abc1");
      const runBranch = parsed ?? worker.branch;
      mgr.touch(worker, { branch: runBranch, status: "handed-off" });
      mgr.reconcileVerifierStartingRefs({
        updatedName: "frontend-toggle",
        newBranch: runBranch,
      });

      expect(mgr.getTask("verify-frontend-toggle")?.startingRef).toBe(
        "agent/foo-abc1"
      );
      expect(readAttentionLog(workspace)).toMatch(
        /verify-frontend-toggle: startingRef reconciled/
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Load-time sweep reconciles persisted verifier rows", async () => {
    const seededState = {
      rootSlug: "ship-refactor",
      attention: [],
      tasks: [
        {
          name: "frontend-toggle",
          type: "worker",
          branch: "agent/frontend-toggle-abcdef",
          startingRef: "main",
          dependsOn: [],
          agentId: "agent-1",
          runId: "run-1",
          parentAgentId: null,
          status: "handed-off",
          resultStatus: "finished",
          handoffPath: "handoffs/frontend-toggle.md",
          startedAt: "2026-04-22T00:00:00.000Z",
          finishedAt: "2026-04-22T00:05:00.000Z",
          lastUpdate: "2026-04-22T00:05:00.000Z",
          note: null,
          slackTs: null,
        },
        {
          name: "verify-frontend-toggle",
          type: "verifier",
          branch: "orch/ship-refactor/verify-frontend-toggle",
          startingRef: "orch/ship-refactor/frontend-toggle",
          dependsOn: ["frontend-toggle"],
          agentId: null,
          runId: null,
          parentAgentId: null,
          status: "pending",
          resultStatus: null,
          handoffPath: null,
          startedAt: null,
          finishedAt: null,
          lastUpdate: null,
          note: null,
          slackTs: null,
        },
      ],
    };

    const workspace = makeWorkspace({ plan: baselinePlan, state: seededState });
    try {
      await AgentManager.load(workspace);
      const persisted = readState(workspace);
      expect(
        persisted.tasks.find(t => t.name === "verify-frontend-toggle")
          ?.startingRef
      ).toBe("agent/frontend-toggle-abcdef");
      expect(readAttentionLog(workspace)).toMatch(
        /verify-frontend-toggle: startingRef reconciled/
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

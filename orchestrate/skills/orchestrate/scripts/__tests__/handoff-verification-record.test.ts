import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AgentManager } from "../core/agent-manager.ts";
import type { State } from "../schemas.ts";

const REPO_URL = "https://github.com/example-org/example-repo";

function makeWorkspace(args: { plan: unknown }): string {
  const workspace = mkdtempSync(join(tmpdir(), "orch-verification-"));
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify(args.plan, null, 2)
  );
  return workspace;
}

function readState(workspace: string): State {
  return JSON.parse(readFileSync(join(workspace, "state.json"), "utf8"));
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

describe("AgentManager.recordHandoffVerification", () => {
  test("Verifier handoff writes verification to the target task", async () => {
    const workspace = makeWorkspace({ plan: baselinePlan });
    try {
      const mgr = await AgentManager.load(workspace);
      const verifier = mgr.getTask("verify-frontend-toggle");
      if (!verifier) throw new Error("verifier task missing");

      mgr.recordHandoffVerification(
        verifier,
        ["## Verification", "live-ui-verified", "## Target", "`x`"].join("\n")
      );

      const target = readState(workspace).tasks.find(
        t => t.name === "frontend-toggle"
      );
      const verifierRow = readState(workspace).tasks.find(
        t => t.name === "verify-frontend-toggle"
      );
      expect(target?.verification).toBe("live-ui-verified");
      // Verifiers don't carry a verification claim of their own; only the
      // target row gets the value so post-run classifiers join one place.
      expect(verifierRow?.verification).toBe(null);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Worker self-report writes verification to its own row", async () => {
    const workspace = makeWorkspace({ plan: baselinePlan });
    try {
      const mgr = await AgentManager.load(workspace);
      const worker = mgr.getTask("frontend-toggle");
      if (!worker) throw new Error("worker task missing");

      mgr.recordHandoffVerification(
        worker,
        ["## Verification", "unit-test-verified", "## Branch", "`x`"].join("\n")
      );

      const persisted = readState(workspace).tasks.find(
        t => t.name === "frontend-toggle"
      );
      expect(persisted?.verification).toBe("unit-test-verified");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Verifier overrides a prior worker self-report on the target", async () => {
    const workspace = makeWorkspace({ plan: baselinePlan });
    try {
      const mgr = await AgentManager.load(workspace);
      const worker = mgr.getTask("frontend-toggle");
      const verifier = mgr.getTask("verify-frontend-toggle");
      if (!worker || !verifier) throw new Error("tasks missing");

      mgr.recordHandoffVerification(
        worker,
        ["## Verification", "type-check-only", ""].join("\n")
      );
      mgr.recordHandoffVerification(
        verifier,
        ["## Verification", "verifier-blocked", ""].join("\n")
      );

      const persisted = readState(workspace).tasks.find(
        t => t.name === "frontend-toggle"
      );
      expect(persisted?.verification).toBe("verifier-blocked");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Legacy ## Verdict pass migrates to type-check-only on read", async () => {
    const workspace = makeWorkspace({ plan: baselinePlan });
    try {
      const mgr = await AgentManager.load(workspace);
      const verifier = mgr.getTask("verify-frontend-toggle");
      if (!verifier) throw new Error("verifier task missing");

      mgr.recordHandoffVerification(
        verifier,
        ["## Verdict", "pass", "## Target", "`x`"].join("\n")
      );

      const target = readState(workspace).tasks.find(
        t => t.name === "frontend-toggle"
      );
      expect(target?.verification).toBe("type-check-only");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Handoff without any verdict section leaves verification null", async () => {
    const workspace = makeWorkspace({ plan: baselinePlan });
    try {
      const mgr = await AgentManager.load(workspace);
      const verifier = mgr.getTask("verify-frontend-toggle");
      if (!verifier) throw new Error("verifier task missing");

      mgr.recordHandoffVerification(
        verifier,
        ["## Status", "success", "## Branch", "`x`"].join("\n")
      );

      const target = readState(workspace).tasks.find(
        t => t.name === "frontend-toggle"
      );
      expect(target?.verification).toBe(null);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

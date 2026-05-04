import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runPromptWithPlan(plan: unknown): ReturnType<typeof spawnSync> {
  const workspace = mkdtempSync(join(tmpdir(), "orchestrate-plan-migration-"));
  writeFileSync(join(workspace, "plan.json"), JSON.stringify(plan, null, 2));

  const cliPath = new URL("../cli.ts", import.meta.url).pathname;
  try {
    return spawnSync(
      process.execPath,
      [cliPath, "prompt", workspace, "first-task"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CURSOR_API_KEY: "",
        },
      }
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

describe("prompt plan validation", () => {
  test("Removed tracker fields print migration guidance", () => {
    const result = runPromptWithPlan({
      goal: "preview a prompt",
      rootSlug: "preview",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tracker: "linear",
      linearTeam: "ENG",
      tasks: [
        {
          name: "first-task",
          type: "worker",
          scopedGoal: "Check the prompt renderer.",
        },
      ],
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/removed plan field/);
    expect(result.stderr).not.toMatch(/CURSOR_API_KEY/);
  });

  test("Verifier task without verifies reports schema error", () => {
    const result = runPromptWithPlan({
      goal: "preview a prompt",
      rootSlug: "preview",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [
        {
          name: "first-task",
          type: "verifier",
          scopedGoal: "Check the prompt renderer.",
        },
      ],
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/tasks\[0\]\.verifies: is required/);
  });

  test("Worker task with verifies reports schema error", () => {
    const result = runPromptWithPlan({
      goal: "preview a prompt",
      rootSlug: "preview",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [
        {
          name: "first-task",
          type: "worker",
          scopedGoal: "Check the prompt renderer.",
          verifies: "other-task",
        },
      ],
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(
      /tasks\[0\]\.verifies: is only valid when type is verifier/
    );
  });
});

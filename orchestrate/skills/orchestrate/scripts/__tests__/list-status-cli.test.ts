import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TaskState } from "../schemas.ts";

const CLI_PATH = new URL("../cli.ts", import.meta.url).pathname;
const SCRIPTS_DIR = new URL("..", import.meta.url).pathname;

function task(name: string, status: TaskState["status"]): TaskState {
  return {
    name,
    type: "worker",
    branch: `orch/list-status/${name}`,
    startingRef: "main",
    dependsOn: [],
    agentId: null,
    runId: null,
    parentAgentId: null,
    status,
    resultStatus: null,
    handoffPath: null,
    startedAt: null,
    finishedAt: null,
    lastUpdate: new Date(0).toISOString(),
    note: null,
    slackTs: null,
    prNumber: null,
    failureMode: null,
    verification: null,
  };
}

function withWorkspace(run: (workspace: string) => void): void {
  const workspace = mkdtempSync(join(tmpdir(), "orch-list-status-"));
  try {
    writeFileSync(
      join(workspace, "plan.json"),
      JSON.stringify({
        goal: "list by status",
        rootSlug: "list-status",
        baseBranch: "main",
        repoUrl: "https://github.com/example-org/example-repo",
        tasks: [
          { name: "stopped", type: "worker", scopedGoal: "Was cancelled." },
          { name: "done", type: "worker", scopedGoal: "Handed off." },
        ],
      })
    );
    writeFileSync(
      join(workspace, "state.json"),
      JSON.stringify({
        rootSlug: "list-status",
        tasks: [task("stopped", "cancelled"), task("done", "handed-off")],
        attention: [],
      })
    );
    run(workspace);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function cli(args: string[]) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: SCRIPTS_DIR,
    encoding: "utf8",
    // Loading a workspace checks for a key; list itself makes no API call.
    env: { ...process.env, CURSOR_API_KEY: "test-key" },
  });
}

describe("list --status", () => {
  test("Help names every task status, including cancelled", () => {
    const result = cli(["list", "--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "pending|running|handed-off|error|cancelled|pruned"
    );
  });

  test("Filters by a known status", () => {
    withWorkspace(workspace => {
      const result = cli(["list", workspace, "--status", "cancelled"]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("stopped");
      expect(result.stdout).not.toContain("done");
    });
  });

  test("Rejects an unknown status instead of printing an empty table", () => {
    withWorkspace(workspace => {
      const result = cli(["list", workspace, "--status", "handed_off"]);
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain("(no tasks match)");
      expect(result.stderr).toContain(
        "--status must be one of pending, running, handed-off, error, cancelled, pruned (got handed_off)"
      );
    });
  });
});

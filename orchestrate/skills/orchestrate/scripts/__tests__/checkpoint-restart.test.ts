import { describe, expect, spyOn, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AgentManager } from "../core/agent-manager.ts";
import {
  PLANNED_CHECKPOINT_EXIT_CODE,
  runOrchestrateLoop,
} from "../core/loop.ts";
import type { TaskState } from "../schemas.ts";

const SCRIPTS_DIR = dirname(
  fileURLToPath(new URL("../cli.ts", import.meta.url))
);

function runningTask(): TaskState {
  return {
    name: "long-runner",
    type: "worker",
    branch: "orch/checkpoint/long-runner",
    startingRef: "main",
    dependsOn: [],
    agentId: "agent-1",
    runId: "run-1",
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

describe("planned checkpoint restart", () => {
  test("Exits 100 after a clean sweep and syncs state first", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-checkpoint-"));
    const task = runningTask();
    const syncedReasons: string[] = [];
    const stderr = spyOn(console, "error").mockImplementation(() => {});
    const nowValues = [0, 2_500, 2_500];

    const mgr = {
      workspace,
      handoffsDir: join(workspace, "handoffs"),
      attentionLog: join(workspace, "attention.log"),
      plan: {
        goal: "checkpoint long work",
        rootSlug: "checkpoint",
        baseBranch: "main",
        repoUrl: "https://github.com/example-org/example-repo",
        tasks: [],
      },
      state: { rootSlug: "checkpoint", tasks: [task], attention: [] },
      tasks: [task],
      commentDestinations: () => ({}),
      andon: {
        drainEvents: async () => {},
        isActive: () => false,
        noteSpawnPaused: () => {},
      },
      getTask: (name: string) => (name === task.name ? task : undefined),
      recoverRunning: async () => null,
      waitAndHandoff: async () => {},
      spawnTask: async () => null,
      depsSatisfied: () => false,
      savePlan: () => {},
      saveState: () => {},
      logAttention: () => {},
      syncStateToGit: (reason: string) => {
        syncedReasons.push(reason);
      },
    } as unknown as AgentManager;

    try {
      const code = await runOrchestrateLoop(mgr, {
        maxRuntimeSec: 2,
        now: () => nowValues.shift() ?? 2_500,
        sleep: async () => {},
      });

      expect(code).toBe(PLANNED_CHECKPOINT_EXIT_CODE);
      expect(syncedReasons).toEqual(["planned checkpoint restart"]);
      expect(stderr.mock.calls[0]?.[0]).toContain(
        "planned checkpoint restart at 2s"
      );
      expect(stderr.mock.calls[0]?.[0]).toContain("pending=0, running=1");
      expect(stderr.mock.calls[0]?.[0]).toContain(
        `re-invoke 'bun cli.ts run ${workspace}' to resume`
      );
    } finally {
      stderr.mockRestore();
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("CLI run exits 100 and leaves checkpoint state pushed", () => {
    const tmp = mkdtempSync(join(tmpdir(), "orch-checkpoint-cli-"));
    const remote = join(tmp, "remote.git");
    const repo = join(tmp, "repo");
    const workspace = join(repo, ".orchestrate", "checkpoint");
    const git = (args: string[], cwd = repo): string =>
      execFileSync("git", args, { cwd, stdio: "pipe" }).toString();

    try {
      execFileSync("git", ["init", "--bare", remote], { stdio: "pipe" });
      mkdirSync(workspace, { recursive: true });
      git(["init"]);
      git(["config", "user.email", "orchestrate-test@example.com"]);
      git(["config", "user.name", "Orchestrate Test"]);
      git(["remote", "add", "origin", remote]);
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify({
          goal: "manual checkpoint",
          rootSlug: "checkpoint",
          baseBranch: "main",
          repoUrl: "https://github.com/example-org/example-repo",
          tasks: [
            {
              name: "long-runner",
              type: "worker",
              scopedGoal: "Keep running until checkpoint.",
            },
          ],
        })
      );
      writeFileSync(
        join(workspace, "state.json"),
        JSON.stringify({
          rootSlug: "checkpoint",
          tasks: [runningTask()],
          attention: [],
        })
      );
      git(["add", "."]);
      git(["commit", "-m", "seed fixture"]);
      git(["push", "-u", "origin", "HEAD"]);

      const childScript = `
        import { mock } from "bun:test";
        const fakeRun = {
          id: "run-1",
          agentId: "agent-1",
          status: "running",
          stream: async function* () { await new Promise(() => {}); },
          wait: () => new Promise(() => {})
        };
        mock.module("@cursor/sdk", () => ({
          Agent: { getRun: async () => fakeRun },
          CursorAgentError: class CursorAgentError extends Error {}
        }));
        const { main } = await import("./cli/index.ts");
        await main([
          "bun",
          "cli.ts",
          "run",
          process.env.CHECK_WORKSPACE ?? "",
          "--max-runtime-sec",
          "1"
        ]);
      `;
      const result = spawnSync(process.execPath, ["-e", childScript], {
        cwd: SCRIPTS_DIR,
        env: {
          ...process.env,
          CHECK_WORKSPACE: workspace,
          CURSOR_API_KEY: "test-key",
        },
        encoding: "utf8",
      });

      expect(result.status).toBe(PLANNED_CHECKPOINT_EXIT_CODE);
      expect(result.stderr).toContain("planned checkpoint restart at 1s");
      expect(result.stderr).toContain("pending=0, running=1");
      expect(result.stderr).toContain(
        `re-invoke 'bun cli.ts run ${workspace}' to resume`
      );
      expect(git(["status", "--short"]).trim()).toBe("");
      expect(git(["log", "--oneline", "-1"])).toContain(
        "orch: checkpoint planned checkpoint restart"
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

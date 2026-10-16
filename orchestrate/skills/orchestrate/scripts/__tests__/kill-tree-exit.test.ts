import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function killTree(failures: number) {
  const script = `
    import { mock } from "bun:test";
    import { Command } from "commander";
    let attempts = 0;
    mock.module("./core/agent-manager.ts", () => ({
      cancelCloudRun: async () => {
        attempts++;
        if (attempts <= ${failures}) throw new Error("backend cancellation failed");
      }
    }));
    mock.module("./cli/util.ts", () => ({
      collectRunningAgentsInTree: () => [
        { taskName:"one", agentId:"a1", runId:"r1", branch:"orch/a/one", parentAgentId:null },
        { taskName:"two", agentId:"a2", runId:"r2", branch:"orch/a/two", parentAgentId:null }
      ],
      filterVictimsToSubtree: victims => victims,
      crawlBranch: () => {},
      errorMessage: error => error.message,
    }));
    const { registerForensicsCommands } = await import("./cli/forensics.ts");
    const program = new Command();
    registerForensicsCommands(program);
    await program.parseAsync(["bun", "cli.ts", "kill-tree", "/offline", "main", "root", "--no-fetch", "-y"]);
  `;
  return spawnSync(process.execPath, ["-e", script], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    encoding: "utf8",
    env: { ...process.env, CURSOR_API_KEY: "offline-test-key" },
  });
}

test("kill-tree exits successfully when every cancellation succeeds", () => {
  const result = killTree(0);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("killed 2 cloud agent(s); 0 failed.");
});

test("kill-tree reports failure while continuing to cancel other agents", () => {
  const result = killTree(1);
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("killed 1 cloud agent(s); 1 failed.");
  expect(result.stderr).toContain("backend cancellation failed");
});

test("kill-tree reports failure when every cancellation fails", () => {
  const result = killTree(2);
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("killed 0 cloud agent(s); 2 failed.");
});

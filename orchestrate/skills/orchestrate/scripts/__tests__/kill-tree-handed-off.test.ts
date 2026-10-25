import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectRunningAgentsInTree } from "../cli/util.ts";

function git(cwd: string, args: string[]): void {
  try {
    execFileSync("git", args, { cwd, stdio: "pipe" });
  } catch (err) {
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String(err.stderr)
        : "";
    throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  }
}

function writeState(
  repo: string,
  slug: string,
  state: { rootSlug: string; tasks: unknown[] }
): void {
  const dir = join(repo, ".orchestrate", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "state.json"), JSON.stringify(state, null, 2));
}

describe("kill-tree descendant collection", () => {
  test("Includes running agents under a handed-off subplanner", () => {
    const repo = mkdtempSync(join(tmpdir(), "orch-kill-handed-"));
    const origin = mkdtempSync(join(tmpdir(), "orch-kill-handed-origin-"));
    try {
      git(repo, ["init", "-b", "main"]);
      git(repo, ["config", "user.email", "orchestrate@example.com"]);
      git(repo, ["config", "user.name", "Orchestrate Test"]);
      git(origin, ["init", "--bare"]);
      git(repo, ["remote", "add", "origin", origin]);

      writeState(repo, "root", {
        rootSlug: "root",
        tasks: [
          {
            name: "slice",
            type: "subplanner",
            status: "handed-off",
            agentId: "bc-slice",
            runId: "run-slice",
            parentAgentId: null,
          },
        ],
      });
      git(repo, ["add", ".orchestrate/root/state.json"]);
      git(repo, ["commit", "-m", "root state"]);
      git(repo, ["push", "-u", "origin", "main"]);

      git(repo, ["checkout", "-b", "orch/root/slice"]);
      writeState(repo, "slice", {
        rootSlug: "slice",
        tasks: [
          {
            name: "worker-one",
            type: "worker",
            status: "running",
            agentId: "bc-worker",
            runId: "run-worker",
            parentAgentId: "bc-slice",
          },
        ],
      });
      git(repo, ["add", ".orchestrate/slice/state.json"]);
      git(repo, ["commit", "-m", "slice state"]);
      git(repo, ["push", "-u", "origin", "orch/root/slice"]);

      const victims = collectRunningAgentsInTree({
        repoPath: repo,
        branch: "main",
        slug: "root",
      });

      expect(victims).toEqual([
        {
          taskName: "worker-one",
          agentId: "bc-worker",
          runId: "run-worker",
          branch: "orch/root/slice",
          parentAgentId: "bc-slice",
        },
      ]);
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(origin, { recursive: true, force: true });
    }
  }, 30_000);
});

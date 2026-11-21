import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  collectRunningAgentsInTree,
  crawlBranch,
  descendsIntoSubplanner,
} from "../cli/util.ts";

function git(repo: string, ...args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
}

/**
 * Builds a repo where `origin/<branch>:.orchestrate/<slug>/state.json` exists
 * for a root planner and one subplanner. The root marks the subplanner
 * `handed-off`; the subplanner's own branch still has a `running` child.
 */
function fixtureRepo(): { repoPath: string; rootBranch: string; rootSlug: string } {
  const repoPath = mkdtempSync(join(tmpdir(), "orch-kill-tree-"));
  git(repoPath, "init", "-q", "-b", "main");
  git(repoPath, "config", "user.email", "t@example.com");
  git(repoPath, "config", "user.name", "t");

  const rootSlug = "ship-refactor";
  // The root planner lives on its own branch; subplanners go under orch/<rootSlug>/<name>.
  const rootBranch = "planner/ship-refactor";
  const childName = "child-planner";

  const commitState = (branch: string, slug: string, state: unknown) => {
    git(repoPath, "checkout", "-q", "--orphan", branch);
    const dir = join(repoPath, ".orchestrate", slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "state.json"), JSON.stringify(state, null, 2));
    git(repoPath, "add", "-A");
    git(repoPath, "commit", "-q", "-m", `state for ${slug}`);
    // The walkers read `origin/<branch>`; point that ref at the local commit.
    git(repoPath, "update-ref", `refs/remotes/origin/${branch}`, "HEAD");
  };

  commitState(rootBranch, rootSlug, {
    rootSlug,
    tasks: [
      {
        name: childName,
        type: "subplanner",
        status: "handed-off",
        agentId: "agent-child",
        runId: "run-child",
      },
    ],
  });
  commitState(`orch/${rootSlug}/${childName}`, childName, {
    rootSlug: childName,
    tasks: [
      {
        name: "verifier",
        type: "worker",
        status: "running",
        agentId: "agent-verifier",
        runId: "run-verifier",
      },
    ],
  });
  return { repoPath, rootBranch, rootSlug };
}

describe("kill-tree walks handed-off subplanners like crawl", () => {
  test("descendsIntoSubplanner follows running and handed-off subplanners only", () => {
    const base = { name: "x", agentId: null, runId: null, parentAgentId: null };
    expect(descendsIntoSubplanner({ ...base, type: "subplanner", status: "running" } as never)).toBe(true);
    expect(descendsIntoSubplanner({ ...base, type: "subplanner", status: "handed-off" } as never)).toBe(true);
    expect(descendsIntoSubplanner({ ...base, type: "subplanner", status: "done" } as never)).toBe(false);
    expect(descendsIntoSubplanner({ ...base, type: "worker", status: "running" } as never)).toBe(false);
  });

  test("a running agent under a handed-off subplanner is both crawled and collected", () => {
    const { repoPath, rootBranch, rootSlug } = fixtureRepo();

    const out: string[] = [];
    crawlBranch({ repoPath, branch: rootBranch, slug: rootSlug }, 0, out, new Set());
    expect(out.join("\n")).toContain("verifier");

    const victims = collectRunningAgentsInTree({ repoPath, branch: rootBranch, slug: rootSlug });
    expect(victims.map(v => v.agentId)).toEqual(["agent-verifier"]);
    expect(victims[0]?.branch).toBe(`orch/${rootSlug}/child-planner`);
  });
});

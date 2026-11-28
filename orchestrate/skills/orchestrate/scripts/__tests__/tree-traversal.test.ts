import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  collectRunningAgentsInTree,
  filterVictimsToSubtree,
} from "../cli/util.ts";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Orchestrate Test",
      GIT_AUTHOR_EMAIL: "orchestrate@example.test",
      GIT_COMMITTER_NAME: "Orchestrate Test",
      GIT_COMMITTER_EMAIL: "orchestrate@example.test",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  });
}

type TreeTaskFixture = {
  name: string;
  type: "worker" | "subplanner";
  status: "pending" | "running" | "handed-off";
  agentId: string | null;
  runId: string | null;
  parentAgentId: string | null;
};

function task(
  name: string,
  type: TreeTaskFixture["type"],
  status: TreeTaskFixture["status"],
  agentId: string | null,
  runId: string | null,
  parentAgentId: string | null
): TreeTaskFixture {
  return { name, type, status, agentId, runId, parentAgentId };
}

function state(rootSlug: string, tasks: TreeTaskFixture[]) {
  return { rootSlug, tasks, attention: [] };
}

function makeOriginFixture(): { repo: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "orch-tree-traversal-"));
  const bare = join(root, "origin.git");
  const repo = join(root, "repo");
  mkdirSync(bare, { recursive: true });
  mkdirSync(repo, { recursive: true });
  git(bare, ["init", "--bare", "--initial-branch=main"]);
  git(repo, ["init", "--initial-branch=main"]);
  git(repo, ["remote", "add", "origin", bare]);
  writeFileSync(join(repo, "README.md"), "# fixture\n");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", "seed"]);

  const publishState = (
    slug: string,
    branch: string,
    tasks: TreeTaskFixture[]
  ) => {
    mkdirSync(join(repo, ".orchestrate", slug), { recursive: true });
    writeFileSync(
      join(repo, ".orchestrate", slug, "state.json"),
      JSON.stringify(state(slug, tasks), null, 2)
    );
    git(repo, ["add", ".orchestrate"]);
    git(repo, ["commit", "-m", `publish ${slug}`]);
    git(repo, ["push", "origin", `HEAD:${branch}`]);
  };

  publishState("handed-off-planner", "orch/root/handed-off-planner", [
    task(
      "handed-off-worker",
      "worker",
      "running",
      "agent-handed-worker",
      "run-handed-worker",
      "agent-handed-planner"
    ),
    task(
      "handed-off-control",
      "worker",
      "running",
      "agent-handed-control",
      "run-handed-control",
      "agent-handed-planner"
    ),
    task(
      "handed-off-completed",
      "worker",
      "handed-off",
      "agent-handed-completed",
      "run-handed-completed",
      "agent-handed-planner"
    ),
  ]);
  git(repo, ["checkout", "main"]);

  publishState("running-planner", "orch/root/running-planner", [
    task(
      "unrelated-worker",
      "worker",
      "running",
      "agent-unrelated-worker",
      "run-unrelated-worker",
      "agent-running-planner"
    ),
    task(
      "unrelated-completed",
      "worker",
      "handed-off",
      "agent-unrelated-completed",
      "run-unrelated-completed",
      "agent-running-planner"
    ),
  ]);
  git(repo, ["checkout", "main"]);

  publishState("root", "main", [
    task("root-worker", "worker", "running", "agent-root", "run-root", null),
    task(
      "handed-off-planner",
      "subplanner",
      "handed-off",
      "agent-handed-planner",
      "run-handed-planner",
      "agent-root-planner"
    ),
    task(
      "running-planner",
      "subplanner",
      "running",
      "agent-running-planner",
      "run-running-planner",
      null
    ),
    task(
      "root-completed",
      "worker",
      "handed-off",
      "agent-root-completed",
      "run-root-completed",
      null
    ),
    task(
      "cycle-worker",
      "worker",
      "running",
      "agent-cycle-worker",
      "run-cycle-worker",
      "agent-cycle-parent"
    ),
    task(
      "cycle-parent",
      "worker",
      "handed-off",
      "agent-cycle-parent",
      "run-cycle-parent",
      "agent-cycle-worker"
    ),
  ]);

  return {
    repo,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("tree traversal", () => {
  test("collects running descendants through handed-off subplanners", () => {
    const fixture = makeOriginFixture();
    try {
      const victims = collectRunningAgentsInTree({
        repoPath: fixture.repo,
        branch: "main",
        slug: "root",
      });

      expect(victims.map(victim => victim.taskName).sort()).toEqual([
        "cycle-worker",
        "handed-off-control",
        "handed-off-worker",
        "root-worker",
        "running-planner",
        "unrelated-worker",
      ]);
      expect(victims.map(victim => victim.agentId).sort()).toEqual([
        "agent-cycle-worker",
        "agent-handed-control",
        "agent-handed-worker",
        "agent-root",
        "agent-running-planner",
        "agent-unrelated-worker",
      ]);
      expect(
        victims.find(victim => victim.taskName === "handed-off-worker")
      ).toMatchObject({
        branch: "orch/root/handed-off-planner",
        parentAgentId: "agent-handed-planner",
      });
      expect(
        victims.some(victim => victim.taskName.includes("completed"))
      ).toBe(false);

      expect(
        filterVictimsToSubtree(victims, "agent-handed-planner").map(
          victim => victim.taskName
        )
      ).toEqual(["handed-off-worker", "handed-off-control"]);
      expect(
        filterVictimsToSubtree(victims, "agent-root-planner").map(
          victim => victim.taskName
        )
      ).toEqual(["handed-off-worker", "handed-off-control"]);
      expect(
        filterVictimsToSubtree(victims, "agent-running-planner").map(
          victim => victim.taskName
        )
      ).toEqual(["running-planner", "unrelated-worker"]);
      expect(
        filterVictimsToSubtree(victims, "agent-cycle-parent").map(
          victim => victim.taskName
        )
      ).toEqual(["cycle-worker"]);
      expect(filterVictimsToSubtree(victims, "agent-cycle-unknown")).toEqual(
        []
      );
      expect(filterVictimsToSubtree(victims, "missing-agent")).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  test("keeps direct parent filtering compatible without ancestry metadata", () => {
    const victims = [
      {
        taskName: "parent",
        agentId: "parent-agent",
        runId: "parent-run",
        branch: "main",
        parentAgentId: null,
      },
      {
        taskName: "child",
        agentId: "child-agent",
        runId: "child-run",
        branch: "main",
        parentAgentId: "parent-agent",
      },
      {
        taskName: "sibling",
        agentId: "sibling-agent",
        runId: "sibling-run",
        branch: "main",
        parentAgentId: "other-agent",
      },
    ];

    expect(
      filterVictimsToSubtree(victims, "parent-agent").map(
        victim => victim.taskName
      )
    ).toEqual(["parent", "child"]);
  });
});

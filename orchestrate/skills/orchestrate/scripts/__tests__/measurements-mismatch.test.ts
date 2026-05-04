import { afterAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AgentManager } from "../core/agent-manager.ts";
import type { TaskState } from "../schemas.ts";

const ORIGINAL_API_KEY = process.env.CURSOR_API_KEY;
process.env.CURSOR_API_KEY = "test-key";

afterAll(() => {
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.CURSOR_API_KEY;
  } else {
    process.env.CURSOR_API_KEY = ORIGINAL_API_KEY;
  }
});

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Tester",
      GIT_AUTHOR_EMAIL: "tester@example.test",
      GIT_COMMITTER_NAME: "Tester",
      GIT_COMMITTER_EMAIL: "tester@example.test",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  });
}

function requireTask(task: TaskState | undefined, name: string): TaskState {
  if (!task) throw new Error(`missing task: ${name}`);
  return task;
}

interface FixtureRepo {
  bare: string;
  bareUrl: string;
  branch: string;
  cleanup: () => void;
}

/** Build a local bare repo with `branch` containing `loc` lines in Settings.tsx. */
function makeFixtureRepo(args: { branch: string; loc: number }): FixtureRepo {
  const root = mkdtempSync(join(tmpdir(), "orch-measure-fixture-"));
  const bare = join(root, "origin.git");
  const work = join(root, "work");
  mkdirSync(bare, { recursive: true });
  mkdirSync(work, { recursive: true });
  git(bare, ["init", "--bare", "--initial-branch=main"]);
  git(work, ["init", "--initial-branch=main"]);
  git(work, ["remote", "add", "origin", bare]);
  writeFileSync(join(work, "README.md"), "# fixture\n");
  git(work, ["add", "."]);
  git(work, ["commit", "-m", "seed"]);
  git(work, ["push", "origin", "main"]);
  git(work, ["checkout", "-b", args.branch]);
  const lines = Array.from({ length: args.loc }, (_, i) => `line ${i + 1}`);
  writeFileSync(join(work, "Settings.tsx"), `${lines.join("\n")}\n`);
  git(work, ["add", "."]);
  git(work, ["commit", "-m", `worker work on ${args.branch}`]);
  git(work, ["push", "origin", args.branch]);
  return {
    bare,
    bareUrl: `file://${bare}`,
    branch: args.branch,
    cleanup: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    },
  };
}

function makeWorkspace(args: { plan: unknown; state: unknown }): string {
  const workspace = mkdtempSync(join(tmpdir(), "orch-measure-ws-"));
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify(args.plan, null, 2)
  );
  writeFileSync(
    join(workspace, "state.json"),
    JSON.stringify(args.state, null, 2)
  );
  return workspace;
}

function readAttention(workspace: string): string {
  try {
    return readFileSync(join(workspace, "attention.log"), "utf8");
  } catch {
    return "";
  }
}

describe("AgentManager.checkWorkerMeasurements", () => {
  test("Measurement mismatch is recorded in attention log", async () => {
    const fixture = makeFixtureRepo({
      branch: "agent/glass-palette-a",
      loc: 290,
    });
    try {
      const plan = {
        goal: "shrink the palette",
        rootSlug: "glass-palette",
        baseBranch: "main",
        repoUrl: fixture.bareUrl,
        tasks: [
          {
            name: "glass-palette-a",
            type: "worker",
            scopedGoal: "Shrink the palette.",
            measurements: [
              {
                name: "LOC(Settings.tsx)",
                command: "cat Settings.tsx",
              },
            ],
          },
        ],
      };
      const state = {
        rootSlug: "glass-palette",
        attention: [],
        tasks: [
          {
            name: "glass-palette-a",
            type: "worker",
            branch: fixture.branch,
            startingRef: "main",
            dependsOn: [],
            agentId: "a-1",
            runId: "r-1",
            parentAgentId: null,
            status: "handed-off",
            resultStatus: "finished",
            handoffPath: null,
            startedAt: null,
            finishedAt: null,
            lastUpdate: null,
            note: null,
            slackTs: null,
          },
        ],
      };
      const workspace = makeWorkspace({ plan, state });
      try {
        const mgr = await AgentManager.load(workspace);
        const worker = requireTask(
          mgr.getTask("glass-palette-a"),
          "glass-palette-a"
        );

        const handoff = [
          "## Status",
          "success",
          "## Branch",
          `\`${fixture.branch}\``,
          "## What I did",
          "- shrunk it",
          "## Measurements",
          "LOC(Settings.tsx): 412 → 395",
          "## Notes",
          "- ok",
        ].join("\n");

        const checks = await mgr.checkWorkerMeasurements(worker, handoff);
        expect(checks).toBeTruthy();
        expect(checks?.length).toBe(1);
        expect(checks?.[0].outcome).toBe("value-mismatch");
        expect(checks?.[0].measured).toBe("290");
        expect(checks?.[0].detail).toMatch(/numeric drift/);

        const attention = readAttention(workspace);
        expect(attention).toMatch(/measurement_mismatch LOC\(Settings\.tsx\)/);
        expect(attention).toMatch(/\[value-mismatch\]/);
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    } finally {
      fixture.cleanup();
    }
  });

  test("Within tolerance matches without attention entry", async () => {
    const fixture = makeFixtureRepo({
      branch: "agent/glass-palette-b",
      loc: 290,
    });
    try {
      const plan = {
        goal: "shrink",
        rootSlug: "glass-palette",
        baseBranch: "main",
        repoUrl: fixture.bareUrl,
        tasks: [
          {
            name: "glass-palette-b",
            type: "worker",
            scopedGoal: "Shrink.",
            measurements: [
              { name: "LOC(Settings.tsx)", command: "cat Settings.tsx" },
            ],
          },
        ],
      };
      const state = {
        rootSlug: "glass-palette",
        attention: [],
        tasks: [
          {
            name: "glass-palette-b",
            type: "worker",
            branch: fixture.branch,
            startingRef: "main",
            dependsOn: [],
            agentId: "a-1",
            runId: "r-1",
            parentAgentId: null,
            status: "handed-off",
            resultStatus: "finished",
            handoffPath: null,
            startedAt: null,
            finishedAt: null,
            lastUpdate: null,
            note: null,
            slackTs: null,
          },
        ],
      };
      const workspace = makeWorkspace({ plan, state });
      try {
        const mgr = await AgentManager.load(workspace);
        const worker = requireTask(
          mgr.getTask("glass-palette-b"),
          "glass-palette-b"
        );

        const handoff = [
          "## Status",
          "success",
          "## Branch",
          `\`${fixture.branch}\``,
          "## What I did",
          "- shrunk it",
          "## Measurements",
          "LOC(Settings.tsx): 412 → 295",
        ].join("\n");

        const checks = await mgr.checkWorkerMeasurements(worker, handoff);
        expect(checks).toBeTruthy();
        expect(checks?.length).toBe(1);
        expect(checks?.[0].outcome).toBe("match");
        expect(readAttention(workspace)).not.toMatch(/measurement_mismatch/);
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    } finally {
      fixture.cleanup();
    }
  });

  test("No measurements declared returns null", async () => {
    const plan = {
      goal: "x",
      rootSlug: "no-measurements",
      baseBranch: "main",
      repoUrl: "https://example.test/never.git",
      tasks: [
        {
          name: "no-measurements",
          type: "worker",
          scopedGoal: "x",
        },
      ],
    };
    const state = {
      rootSlug: "no-measurements",
      attention: [],
      tasks: [
        {
          name: "no-measurements",
          type: "worker",
          branch: "agent/no-measurements-1",
          startingRef: "main",
          dependsOn: [],
          agentId: "a",
          runId: "r",
          parentAgentId: null,
          status: "handed-off",
          resultStatus: "finished",
          handoffPath: null,
          startedAt: null,
          finishedAt: null,
          lastUpdate: null,
          note: null,
          slackTs: null,
        },
      ],
    };
    const workspace = makeWorkspace({ plan, state });
    try {
      const mgr = await AgentManager.load(workspace);
      const worker = requireTask(
        mgr.getTask("no-measurements"),
        "no-measurements"
      );
      const checks = await mgr.checkWorkerMeasurements(
        worker,
        "## Status\nsuccess\n"
      );
      expect(checks).toBe(null);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

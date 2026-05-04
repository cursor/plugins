import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const SCRIPTS_DIR = new URL("..", import.meta.url).pathname;

import {
  MAX_BOOT_MS,
  findActiveRootPlanner,
  inferKickoffRootSlug,
} from "../cli/task.ts";

describe("kickoff dedupe", () => {
  test("adopts a recent active root for the same slug", async () => {
    const now = Date.parse("2026-05-01T16:00:00.000Z");
    let createCalls = 0;
    const active = await findActiveRootPlanner(
      {
        async list() {
          return {
            items: [
              {
                agentId: "bc-old",
                name: "refactor-ui-root",
                createdAt: now - MAX_BOOT_MS - 1,
                latestRun: { id: "run-old", status: "running" },
              },
              {
                agentId: "bc-active",
                name: "refactor-ui-root",
                createdAt: now - 1_000,
                latestRun: { id: "run-active", status: "pending" },
              },
            ],
          };
        },
        async listRuns() {
          createCalls++;
          return { items: [] };
        },
      },
      "refactor-ui",
      now
    );

    expect(active).toEqual({
      agentId: "bc-active",
      runId: "run-active",
      status: "pending",
      name: "refactor-ui-root",
    });
    expect(createCalls).toBe(0);
  });

  test("allows different slugs to run side by side", async () => {
    const now = Date.parse("2026-05-01T16:00:00.000Z");
    const active = await findActiveRootPlanner(
      {
        async list() {
          return {
            items: [
              {
                agentId: "bc-other",
                name: "docs-loc-root",
                createdAt: now - 1_000,
                latestRun: { id: "run-other", status: "running" },
              },
            ],
          };
        },
      },
      "refactor-ui",
      now
    );

    expect(active).toBeNull();
  });

  test("falls back to listRuns when list omits latest run", async () => {
    const now = Date.parse("2026-05-01T16:00:00.000Z");
    const active = await findActiveRootPlanner(
      {
        async list() {
          return {
            items: [
              {
                agentId: "bc-active",
                name: "refactor-ui-root",
                createdAt: new Date(now - 1_000).toISOString(),
              },
            ],
          };
        },
        async listRuns(agentId) {
          expect(agentId).toBe("bc-active");
          return { items: [{ id: "run-active", _status: "running" }] };
        },
      },
      "refactor-ui",
      now
    );

    expect(active?.agentId).toBe("bc-active");
    expect(active?.runId).toBe("run-active");
  });

  test("infers root slug from an explicit kickoff prefix", () => {
    expect(inferKickoffRootSlug("refactor-ui: shrink Settings")).toBe("refactor-ui");
    expect(inferKickoffRootSlug("`refactor-ui`: shrink Settings")).toBe("refactor-ui");
  });

  test("kickoff command adopts unless --force is passed", () => {
    const adopt = spawnKickoff(false);
    expect(adopt.status).toBe(0);
    expect(adopt.stdout).toContain("adopting bc-existing");
    expect(adopt.stdout).toContain('"adopted":true');

    const forced = spawnKickoff(true);
    expect(forced.status).toBe(0);
    expect(forced.stdout).toContain('"agentId":"bc-new"');
    expect(forced.stdout).not.toContain("adopting");
  });
});

function spawnKickoff(force: boolean) {
  const script = `
    import { mock } from "bun:test";
    mock.module("@cursor/sdk", () => ({
      CursorAgentError: class CursorAgentError extends Error {},
      Agent: {
        list: async () => {
          if (${force ? "true" : "false"}) throw new Error("list should not run with --force");
          return {
            items: [{
              agentId: "bc-existing",
              name: "refactor-ui-root",
              createdAt: Date.now(),
              latestRun: { id: "run-existing", status: "running" }
            }]
          };
        },
        create: async () => ({
          agentId: "bc-new",
          send: async () => ({ id: "run-new", status: "running" })
        })
      }
    }));
    const { main } = await import("./cli/index.ts");
    await main([
      "bun",
      "cli.ts",
      "kickoff",
      "refactor-ui: shrink Settings",
      "--repo",
      "https://github.com/example-org/example-repo",
      "--dispatcher-name",
      "Alex",
      ${force ? '"--force",' : ""}
    ]);
  `;
  return spawnSync(process.execPath, ["-e", script], {
    cwd: SCRIPTS_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      CURSOR_API_KEY: "test-key",
    },
  });
}

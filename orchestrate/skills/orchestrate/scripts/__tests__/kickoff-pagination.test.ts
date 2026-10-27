import { expect, test } from "bun:test";
import { findActiveRootPlanner } from "../cli/task.ts";

const now = Date.parse("2026-10-16T16:00:00Z");
const matching = {
  agentId: "matching",
  name: "refactor-root",
  createdAt: now - 1000,
  latestRun: { id: "run-matching", status: "running" },
};

test("finds an active matching planner on a later list page", async () => {
  const cursors: (string | undefined)[] = [];
  const api = {
    async list(opts: { cursor?: string }) {
      cursors.push(opts.cursor);
      return opts.cursor
        ? { items: [matching] }
        : {
            items: [{ ...matching, agentId: "other", name: "different-root" }],
            nextCursor: "next-page",
          };
    },
  };
  const result = await findActiveRootPlanner(api, "refactor", now);
  expect(result?.agentId).toBe("matching");
  expect(cursors).toEqual([undefined, "next-page"]);
});

test("follows cursors even when an intermediate page is empty", async () => {
  const api = {
    async list(opts: { cursor?: string }) {
      return opts.cursor
        ? { items: [matching] }
        : { items: [], nextCursor: "next-page" };
    },
  };
  expect((await findActiveRootPlanner(api, "refactor", now))?.runId).toBe(
    "run-matching"
  );
});

test("an exhausted empty listing has no active planner", async () => {
  expect(
    await findActiveRootPlanner(
      { list: async () => ({ items: [] }) },
      "refactor",
      now
    )
  ).toBeNull();
});

test("propagates later-page lookup failures instead of authorizing a duplicate", async () => {
  const api = {
    async list(opts: { cursor?: string }) {
      if (opts.cursor) throw new Error("list unavailable");
      return { items: [], nextCursor: "next-page" };
    },
  };
  await expect(findActiveRootPlanner(api, "refactor", now)).rejects.toThrow(
    "list unavailable"
  );
});

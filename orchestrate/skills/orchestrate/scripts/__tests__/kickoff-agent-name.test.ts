import { describe, expect, test } from "bun:test";

import { inferKickoffRootSlug } from "../cli/task.ts";

const ROOT_SUFFIX = "-root";
const NAME_MAX = 100;

describe("kickoff root planner name", () => {
  test("Keeps a short explicit slug and the -root suffix within the server cap", () => {
    expect(inferKickoffRootSlug("refactor-ui: shrink Settings")).toBe(
      "refactor-ui"
    );
    expect(`refactor-ui${ROOT_SUFFIX}`.length).toBeLessThanOrEqual(NAME_MAX);
  });

  test("Caps an explicit slug so slug-root is at most 100 characters", () => {
    const slug = inferKickoffRootSlug(`${"a".repeat(120)}: ship the migration`);
    expect(`${slug}${ROOT_SUFFIX}`.length).toBeLessThanOrEqual(NAME_MAX);
    expect(slug.startsWith("a")).toBe(true);
    expect(slug.endsWith(ROOT_SUFFIX)).toBe(false);
  });

  test("Caps a free-text goal so the root agent name fits the server cap", () => {
    const slug = inferKickoffRootSlug("b".repeat(180));
    expect(`${slug}${ROOT_SUFFIX}`.length).toBeLessThanOrEqual(NAME_MAX);
    expect(slug.length).toBeGreaterThan(0);
  });
});

import { describe, expect, spyOn, test } from "bun:test";

import {
  NudgeDeadlineError,
  waitMsUntilDeadline,
  waitUntilIdle,
} from "../tools/nudge-root.ts";

describe("nudge max-wait", () => {
  test("Sleeps only until the deadline when the poll interval is longer", () => {
    expect(
      waitMsUntilDeadline({ now: 0, deadline: 1_000, pollMs: 15_000 })
    ).toBe(1_000);
  });

  test("Uses the poll interval when the deadline is further out", () => {
    expect(
      waitMsUntilDeadline({ now: 0, deadline: 60_000, pollMs: 15_000 })
    ).toBe(15_000);
  });

  test("Does not sleep once the deadline has passed", () => {
    expect(
      waitMsUntilDeadline({ now: 5_000, deadline: 5_000, pollMs: 15_000 })
    ).toBe(null);
    expect(
      waitMsUntilDeadline({ now: 5_001, deadline: 5_000, pollMs: 15_000 })
    ).toBe(null);
  });

  test("Idle wait stops at the deadline instead of sleeping a full poll", async () => {
    const log = spyOn(console, "log").mockImplementation(() => {});
    let now = 0;
    const sleeps: number[] = [];
    try {
      await expect(
        waitUntilIdle(
          {
            agentId: "bc-root",
            message: "ping",
            waitIdle: true,
            maxWaitMs: 1_000,
            pollMs: 15_000,
          },
          1_000,
          {
            now: () => now,
            sleep: async ms => {
              sleeps.push(ms);
              now += ms;
            },
            listRuns: async () => ({ items: [{ status: "running" }] }),
          }
        )
      ).rejects.toBeInstanceOf(NudgeDeadlineError);
      expect(sleeps).toEqual([1_000]);
      expect(now).toBe(1_000);
    } finally {
      log.mockRestore();
    }
  });
});

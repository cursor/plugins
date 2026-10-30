import { describe, expect, it } from "bun:test";
import {
  createQueueState,
  evaluateQueue,
  readSnapshot,
  runQueued,
  runSimple,
} from "./policy.ts";
import { fakeReader } from "./fakes.test-helper.ts";
import type {
  GitHubReader,
  PollingOptions,
  PrContext,
  ProgressVerdict,
  PullRequestFacts,
} from "./types.ts";
import { parsePrNumber } from "./types.ts";

const context = (number: number): PrContext => ({
  owner: "owner",
  repo: "repo",
  number: parsePrNumber(number),
});
const options = {
  interval: 60,
  sweepInterval: 300,
  timeout: 0,
  maxQueryErrors: 5,
  allowDraft: false,
} satisfies PollingOptions;

// Clean CI, no review threads. GitHub's BEHIND merge state means the head
// ref is out of date and the merge is refused until the branch is updated.
const behind = { mergeable: "MERGEABLE", mergeStateStatus: "BEHIND" } as const;

function clockAt(start = 0) {
  let now = start;
  const sleeps: number[] = [];
  return {
    sleeps,
    clock: {
      now: () => now,
      observedAt: () => "2026-10-24T00:00:00.000Z",
      async sleep(seconds: number) {
        sleeps.push(seconds);
        now += seconds;
      },
    },
  };
}

describe("head behind the base branch", () => {
  it("does not report READY, then times out because the branch is behind", async () => {
    const emitted: ProgressVerdict[] = [];
    const { clock } = clockAt();
    const result = await runSimple({
      dependencies: {
        reader: fakeReader({ facts: behind }),
        clock,
        emit: (verdict) => emitted.push(verdict),
      },
      contexts: [context(1)],
      mode: "single",
      statusOnly: false,
      options: { ...options, timeout: 30 },
    });
    expect(result.kind).not.toBe("READY");
    expect(emitted[0]).toMatchObject({
      kind: "WAITING",
      frontier: { number: 1 },
      reason: { kind: "branch-behind" },
    });
    expect(result).toMatchObject({
      kind: "TIMEOUT",
      exitCode: 5,
      reason: { kind: "branch-behind", frontier: { number: 1 } },
    });
  });

  it("reports READY once the branch is no longer behind", async () => {
    let reads = 0;
    const stale = fakeReader({ facts: behind });
    const current = fakeReader();
    const reader: GitHubReader = {
      ...stale,
      async pullRequest(pr): Promise<PullRequestFacts> {
        reads += 1;
        return reads === 1 ? stale.pullRequest(pr) : current.pullRequest(pr);
      },
    };
    const emitted: ProgressVerdict[] = [];
    const { clock, sleeps } = clockAt();
    const result = await runSimple({
      dependencies: { reader, clock, emit: (verdict) => emitted.push(verdict) },
      contexts: [context(1)],
      mode: "single",
      statusOnly: false,
      options,
    });
    expect(emitted).toMatchObject([
      {
        kind: "WAITING",
        frontier: { number: 1 },
        reason: { kind: "branch-behind" },
      },
    ]);
    expect(sleeps).toEqual([60]);
    expect(result).toMatchObject({
      kind: "READY",
      scope: { kind: "single", pr: { kind: "ready-pr" } },
    });
  });

  it("does not clear a stack while one PR is behind", async () => {
    const { clock } = clockAt();
    const result = await runSimple({
      dependencies: {
        reader: fakeReader({ facts: behind }),
        clock,
        emit() {},
      },
      contexts: [context(10), context(11)],
      mode: "stack",
      statusOnly: false,
      options: { ...options, timeout: 30 },
    });
    expect(result.kind).not.toBe("READY");
    expect(result).toMatchObject({
      kind: "TIMEOUT",
      exitCode: 5,
      reason: { kind: "branch-behind", frontier: { number: 10 } },
    });
  });

  it("does not treat a queued frontier as merge-ready while it is behind", async () => {
    const frontier = await readSnapshot({
      reader: fakeReader({ facts: behind }),
      context: context(20),
      pendingHistory: "omit",
      allowDraft: false,
    });
    const state = {
      ...createQueueState([context(20)], 0),
      snapshots: new Map([[frontier.context.number, frontier]]),
      work: null,
    };
    expect(evaluateQueue(state, 0, options)).toMatchObject({
      kind: "waiting",
      frontier: { number: 20 },
      reason: { kind: "branch-behind" },
    });
  });

  it("times out a queued frontier as behind rather than ready", async () => {
    const { clock } = clockAt();
    const result = await runQueued({
      dependencies: {
        reader: fakeReader({ facts: behind }),
        clock,
        emit() {},
      },
      contexts: [context(20)],
      options: { ...options, timeout: 30 },
    });
    expect(result.kind).not.toBe("READY");
    expect(result).toMatchObject({
      kind: "TIMEOUT",
      exitCode: 5,
      reason: { kind: "branch-behind", frontier: { number: 20 } },
    });
  });

  it("still reports READY for UNSTABLE and UNKNOWN merge states", async () => {
    for (const mergeStateStatus of ["UNSTABLE", "UNKNOWN"] as const) {
      const result = await runSimple({
        dependencies: {
          reader: fakeReader({
            facts: { mergeable: "MERGEABLE", mergeStateStatus },
          }),
          clock: clockAt().clock,
          emit() {},
        },
        contexts: [context(1)],
        mode: "single",
        statusOnly: false,
        options,
      });
      expect(result).toMatchObject({ kind: "READY" });
    }
  });
});

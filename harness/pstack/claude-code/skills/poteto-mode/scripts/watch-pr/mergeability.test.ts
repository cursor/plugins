import { describe, expect, it } from "bun:test";
import {
  createQueueState,
  evaluateQueue,
  readSnapshot,
  runSimple,
  selectTierMajorStackDecision,
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

// GitHub answers UNKNOWN while it recomputes the merge after a push or a base
// change; CI and review state are already clean at that point.
const computing = { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" } as const;

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

describe("mergeability still being computed", () => {
  it("waits instead of reporting READY, then reports READY once GitHub settles", async () => {
    let reads = 0;
    const unknown = fakeReader({ facts: computing });
    const settled = fakeReader();
    const reader: GitHubReader = {
      ...unknown,
      async pullRequest(pr): Promise<PullRequestFacts> {
        reads += 1;
        return reads === 1 ? unknown.pullRequest(pr) : settled.pullRequest(pr);
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
        reason: { kind: "mergeability-unknown" },
      },
    ]);
    expect(sleeps).toEqual([60]);
    expect(result).toMatchObject({
      kind: "READY",
      scope: { kind: "single", pr: { kind: "ready-pr" } },
    });
  });

  it("times out on a deadline while mergeability stays unknown", async () => {
    const { clock } = clockAt();
    const result = await runSimple({
      dependencies: { reader: fakeReader({ facts: computing }), clock, emit() {} },
      contexts: [context(1)],
      mode: "single",
      statusOnly: false,
      options: { ...options, timeout: 30 },
    });
    expect(result).toMatchObject({
      kind: "TIMEOUT",
      exitCode: 5,
      reason: { kind: "mergeability-unknown", frontier: { number: 1 } },
    });
  });

  it("does not clear a stack while one PR's mergeability is unknown", async () => {
    const bottom = await readSnapshot({
      reader: fakeReader(),
      context: context(10),
      pendingHistory: "include",
      allowDraft: false,
    });
    const upstack = await readSnapshot({
      reader: fakeReader({ facts: computing }),
      context: context(11),
      pendingHistory: "include",
      allowDraft: false,
    });
    expect(selectTierMajorStackDecision([bottom, upstack])).toEqual({
      kind: "computing-mergeability",
      frontier: context(11),
    });
  });

  it("does not report a queued frontier as merge-ready while its mergeability is unknown", async () => {
    const frontier = await readSnapshot({
      reader: fakeReader({ facts: computing }),
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
      reason: { kind: "mergeability-unknown" },
    });
  });
});

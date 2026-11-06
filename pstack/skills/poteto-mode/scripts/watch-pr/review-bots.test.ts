import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CliRuntime, main } from "./cli.ts";
import { fakeReader, passingCheck } from "./fakes.test-helper.ts";
import {
  buildReviewThreads,
  mapRollupNode,
  parseFastCheck,
  parseReviewThreadPage,
} from "./github.ts";
import {
  DEFAULT_REVIEW_BOTS,
  ReviewBotConfigError,
  parseReviewBots,
} from "./review-bots.ts";
import type { Check, GitHubReader, ReviewThread } from "./types.ts";

// Synthetic review-bot payloads in the shapes GitHub returns: GraphQL review
// threads (first comment, reviewed commit), rollup nodes and `gh pr checks`
// rows. Bodies carry each bot's pass marker and nothing else of note.
interface Finding {
  readonly id: string;
  readonly login: string;
  readonly body: string;
  readonly path: string;
  readonly line: number | null;
  readonly commit: string;
  readonly resolved?: boolean;
}
const sha = (digit: string) => digit.repeat(40);
const cubicBody = (run: string, text: string) =>
  `<!-- cubic:review-run=${run} -->\n${text}`;
const codeRabbitBody = (comment: number, text: string) =>
  `_Potential issue_\n\n**${text}**\n\n<!-- cr-comment:v1:${comment} -->`;
const codexBody = (text: string) =>
  `**P1: ${text}**\n\nUseful? React with 👍 / 👎.`;
const threadPage = (findings: readonly Finding[]) => ({
  data: {
    repository: {
      pullRequest: {
        reviewThreads: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: findings.map((finding) => ({
            id: finding.id,
            isResolved: finding.resolved ?? false,
            comments: {
              nodes: [
                {
                  body: finding.body,
                  createdAt: "2026-01-01T00:00:00Z",
                  path: finding.path,
                  line: finding.line,
                  author: { login: finding.login },
                  pullRequestReview: { commit: { oid: finding.commit } },
                },
              ],
            },
          })),
        },
      },
    },
  },
});
const sample = {
  reviewThreads: {
    // Open findings: Cubic from two review runs, CodeRabbit from one review
    // of one commit.
    coderabbitAndCubic: threadPage([
      { id: "T1", login: "cubic-dev-ai", body: cubicBody("a1", "P3: Cubic finding 1."), path: "src/a.ts", line: 10, commit: sha("1") },
      { id: "T2", login: "cubic-dev-ai", body: cubicBody("b2", "P2: Cubic finding 2."), path: "src/b.ts", line: 20, commit: sha("2") },
      { id: "T3", login: "coderabbitai", body: codeRabbitBody(1, "CodeRabbit finding 3."), path: "src/c.ts", line: 30, commit: sha("3") },
      { id: "T4", login: "coderabbitai", body: codeRabbitBody(2, "CodeRabbit finding 4."), path: "src/d.ts", line: 40, commit: sha("3") },
      { id: "T5", login: "coderabbitai", body: codeRabbitBody(3, "CodeRabbit finding 5."), path: "src/e.ts", line: 50, commit: sha("3") },
    ]),
    // Mostly resolved: an unlisted bot, the Codex connector on one commit,
    // CodeRabbit on two commits, Cubic from two review runs.
    codexCubicAndOtherBot: threadPage([
      { id: "U1", login: "other-review-bot", body: "Finding 1.", path: "src/a.ts", line: null, commit: sha("4"), resolved: true },
      { id: "U2", login: "other-review-bot", body: "Finding 2.", path: "src/b.ts", line: null, commit: sha("4"), resolved: true },
      { id: "U3", login: "other-review-bot", body: "Finding 3.", path: "src/c.ts", line: 3, commit: sha("4"), resolved: true },
      { id: "U4", login: "chatgpt-codex-connector", body: codexBody("Codex finding 4."), path: "src/d.ts", line: null, commit: sha("4") },
      { id: "U5", login: "chatgpt-codex-connector", body: codexBody("Codex finding 5."), path: "src/e.ts", line: null, commit: sha("4") },
      { id: "U6", login: "coderabbitai", body: codeRabbitBody(4, "CodeRabbit finding 6."), path: "src/f.ts", line: null, commit: sha("4"), resolved: true },
      { id: "U7", login: "cubic-dev-ai", body: cubicBody("c3", "P1: Cubic finding 7."), path: "src/g.ts", line: null, commit: sha("4"), resolved: true },
      { id: "U8", login: "cubic-dev-ai", body: cubicBody("c3", "P2: Cubic finding 8."), path: "src/h.ts", line: null, commit: sha("4"), resolved: true },
      { id: "U9", login: "cubic-dev-ai", body: cubicBody("c3", "P2: Cubic finding 9."), path: "src/i.ts", line: null, commit: sha("4") },
      { id: "U10", login: "coderabbitai", body: codeRabbitBody(5, "CodeRabbit finding 10."), path: "src/j.ts", line: null, commit: sha("5"), resolved: true },
      { id: "U11", login: "cubic-dev-ai", body: cubicBody("d4", "P3: Cubic finding 11."), path: "src/k.ts", line: 11, commit: sha("6"), resolved: true },
    ]),
  },
  rollupNodes: {
    coderabbitPending: {
      __typename: "StatusContext",
      context: "CodeRabbit",
      state: "PENDING",
      targetUrl: null,
    },
    cubicCompleted: {
      __typename: "CheckRun",
      name: "cubic · AI code reviewer",
      status: "COMPLETED",
      conclusion: "NEUTRAL",
      detailsUrl: "https://example.com/review/1",
    },
  },
  ghPrChecks: {
    coderabbitPending: {
      bucket: "pending",
      description: "Review in progress",
      link: "",
      name: "CodeRabbit",
      state: "PENDING",
      workflow: "",
    },
    cubicSkipped: {
      bucket: "skipping",
      description: "",
      link: "https://example.com/review/1",
      name: "cubic · AI code reviewer",
      state: "NEUTRAL",
      workflow: "",
    },
  },
};

const threadsOf = (response: unknown) =>
  buildReviewThreads(
    parseReviewThreadPage(response).threads,
    DEFAULT_REVIEW_BOTS
  );

describe("review-bot detection", () => {
  it("names the bot behind each CodeRabbit and Cubic thread", () => {
    const threads = threadsOf(sample.reviewThreads.coderabbitAndCubic);
    expect(threads.map((thread) => thread.reviewBot)).toEqual([
      "cubic",
      "cubic",
      "coderabbit",
      "coderabbit",
      "coderabbit",
    ]);
  });

  it("names the Codex connector and leaves an unlisted bot unnamed", () => {
    const raw = parseReviewThreadPage(
      sample.reviewThreads.codexCubicAndOtherBot
    ).threads;
    const other = raw.filter(
      (thread) => thread.firstComment?.authorLogin === "other-review-bot"
    );
    const reopened = other.map((thread) => ({ ...thread, resolved: false }));
    const threads = buildReviewThreads(
      [...raw, ...reopened],
      DEFAULT_REVIEW_BOTS
    );
    expect(
      threads.map((thread) => [thread.firstComment?.authorLogin, thread.reviewBot])
    ).toEqual([
      ["chatgpt-codex-connector", "codex-connector"],
      ["chatgpt-codex-connector", "codex-connector"],
      ["cubic-dev-ai", "cubic"],
      ["other-review-bot", null],
      ["other-review-bot", null],
      ["other-review-bot", null],
    ]);
  });

  it("takes bot identity from the config, not from built-in names", () => {
    const raw = parseReviewThreadPage(
      sample.reviewThreads.coderabbitAndCubic
    ).threads;
    const onlyCodeRabbitAs = parseReviewBots({
      bots: [{ id: "rabbit", authors: [{ login: "CodeRabbitAI[bot]" }] }],
    });
    expect(
      buildReviewThreads(raw, onlyCodeRabbitAs).map((thread) => thread.reviewBot)
    ).toEqual([null, null, "rabbit", "rabbit", "rabbit"]);
  });

  it("matches a REST-style [bot] login the same as the GraphQL login", () => {
    const comment = {
      authorLogin: "cubic-dev-ai[bot]",
      body: "<!-- cubic:review-run=run-1 -->",
      path: null,
      line: null,
      createdAt: "now",
      reviewedCommit: null,
    };
    expect(
      buildReviewThreads(
        [{ id: "rest", firstComment: comment, resolved: false }],
        DEFAULT_REVIEW_BOTS
      )[0].reviewBot
    ).toBe("cubic");
  });
});

describe("review-bot pass counting", () => {
  const passesByBot = (threads: readonly ReviewThread[]) =>
    Object.fromEntries(
      threads.map((thread) => [thread.reviewBot, thread.reviewBotPasses])
    );

  it("counts each bot's passes by its own run marker", () => {
    // Two Cubic findings from two review runs, three CodeRabbit findings
    // from one review of one commit.
    expect(
      passesByBot(threadsOf(sample.reviewThreads.coderabbitAndCubic))
    ).toEqual({ cubic: 2, coderabbit: 1 });
  });

  it("counts resolved threads toward the pass count", () => {
    // Cubic reviewed twice (one finding still open), the Codex connector
    // reviewed one commit (two findings open).
    expect(
      passesByBot(threadsOf(sample.reviewThreads.codexCubicAndOtherBot))
    ).toEqual({ "codex-connector": 1, cubic: 2 });
  });

  it("counts CodeRabbit passes by the commit each cr-comment review covered", () => {
    const raw = parseReviewThreadPage(
      sample.reviewThreads.codexCubicAndOtherBot
    ).threads;
    const reopened = raw.map((thread) =>
      thread.firstComment?.authorLogin === "coderabbitai"
        ? { ...thread, resolved: false }
        : thread
    );
    expect(
      passesByBot(buildReviewThreads(reopened, DEFAULT_REVIEW_BOTS)).coderabbit
    ).toBe(2);
  });

  it("does not count a CodeRabbit thread without a cr-comment marker as a pass", () => {
    const chat = {
      id: "chat",
      resolved: false,
      firstComment: {
        authorLogin: "coderabbitai",
        body: "<!-- This is an auto-generated reply by CodeRabbit -->",
        path: null,
        line: null,
        createdAt: "now",
        reviewedCommit: "9".repeat(40),
      },
    };
    const raw = parseReviewThreadPage(
      sample.reviewThreads.coderabbitAndCubic
    ).threads;
    const threads = buildReviewThreads([...raw, chat], DEFAULT_REVIEW_BOTS);
    expect(threads.at(-1)).toMatchObject({
      reviewBot: "coderabbit",
      reviewBotPasses: 1,
    });
  });

  it("reaches the third pass when a bot reviews a third time", () => {
    const raw = parseReviewThreadPage(
      sample.reviewThreads.codexCubicAndOtherBot
    ).threads;
    const third = {
      id: "third",
      resolved: false,
      firstComment: {
        authorLogin: "cubic-dev-ai",
        body: cubicBody("ff", "P2: finding"),
        path: "a.ts",
        line: 1,
        createdAt: "now",
        reviewedCommit: null,
      },
    };
    expect(
      buildReviewThreads([...raw, third], DEFAULT_REVIEW_BOTS)
        .filter((thread) => thread.reviewBot === "cubic")
        .map((thread) => thread.reviewBotPasses)
    ).toEqual([3, 3]);
  });

  it("gives threads from people no bot and no passes", () => {
    const human = {
      id: "human",
      resolved: false,
      firstComment: {
        authorLogin: "reviewer",
        body: "RUN_ID: not-a-bot",
        path: null,
        line: null,
        createdAt: "now",
        reviewedCommit: null,
      },
    };
    expect(buildReviewThreads([human], DEFAULT_REVIEW_BOTS)[0]).toMatchObject({
      reviewBot: null,
      reviewBotPasses: 0,
    });
  });
});

describe("running review-bot gate", () => {
  const rollup = sample.rollupNodes;
  const ci = { __typename: "CheckRun", name: "ci", status: "COMPLETED", conclusion: "SUCCESS" };
  // GitHub reports an open Cubic run as the same check run with a
  // non-completed status and no conclusion yet.
  const cubicRunning = { ...rollup.cubicCompleted, status: "IN_PROGRESS", conclusion: null };

  const viaRollup = (...nodes: unknown[]) =>
    fakeReader({
      fastPath: { kind: "unusable", exitCode: 8, stderr: "" },
      rollupPages: [
        {
          checks: nodes
            .map(mapRollupNode)
            .filter((check): check is Check => check !== null),
          endCursor: null,
        },
      ],
    });

  function harness(reader: GitHubReader) {
    const stdout: string[] = [];
    let now = 0;
    const runtime: CliRuntime = {
      reader,
      clock: {
        now: () => (now += 10),
        observedAt: () => "2026-10-12T00:00:00.000Z",
        sleep: async () => {},
      },
      stdout: (value) => stdout.push(value),
      stderr: () => {},
    };
    const events = () => stdout.map((line) => JSON.parse(line));
    return { runtime, events };
  }
  // The clock advances 10s per read, so the deadline passes after one poll.
  const watch = ["--owner", "owner", "--repo", "repo", "--pr", "1", "--timeout", "5"];

  it.each([
    ["a CodeRabbit status in progress", () => viaRollup(ci, rollup.coderabbitPending, rollup.cubicCompleted), "CodeRabbit"],
    [
      "a CodeRabbit status in progress, read through gh pr checks",
      () =>
        fakeReader({
          fastPath: {
            kind: "checks",
            checks: [
              passingCheck(),
              parseFastCheck(sample.ghPrChecks.coderabbitPending),
              parseFastCheck(sample.ghPrChecks.cubicSkipped),
            ],
          },
        }),
      "CodeRabbit",
    ],
    ["a Cubic review run in progress", () => viaRollup(ci, cubicRunning), "cubic · AI code reviewer"],
  ])("holds READY while %s", async (_label, reader, check) => {
    const run = harness(reader());
    expect(await main(watch, run.runtime)).toBe(5);
    const events = run.events();
    expect(events.map((event) => event.kind)).toEqual(["WAITING", "TIMEOUT"]);
    expect(events[0].reason.pending.map((pending: Check) => pending.name)).toEqual([check]);
  });

  it("reports READY once the reviews have finished", async () => {
    const finished = { ...rollup.coderabbitPending, state: "SUCCESS" };
    const run = harness(viaRollup(ci, finished, rollup.cubicCompleted));
    expect(await main(watch, run.runtime)).toBe(0);
    expect(run.events().map((event) => event.kind)).toEqual(["READY"]);
  });

  it("flags review automation as running from the configured check names", async () => {
    const statusOf = async (extra: readonly string[]) => {
      const run = harness(viaRollup(ci, rollup.coderabbitPending));
      await main([...watch, "--status-only", ...extra], run.runtime);
      return run.events()[0].rows[0].reviewAutomationRunning;
    };
    const dir = mkdtempSync(join(tmpdir(), "review-bots-"));
    const withoutCodeRabbit = join(dir, "review-bots.json");
    writeFileSync(
      withoutCodeRabbit,
      JSON.stringify({
        bots: [
          { id: "cubic", authors: [{ login: "cubic-dev-ai" }], runningChecks: ["cubic · AI code reviewer"] },
        ],
      })
    );
    try {
      expect(await statusOf([])).toBe(true);
      expect(await statusOf(["--review-bots", withoutCodeRabbit])).toBe(false);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("rejects an unreadable or invalid --review-bots file as usage", async () => {
    const dir = mkdtempSync(join(tmpdir(), "review-bots-"));
    const invalid = join(dir, "invalid.json");
    writeFileSync(invalid, JSON.stringify({ bots: [{ id: "x" }] }));
    try {
      for (const path of [invalid, join(dir, "missing.json")]) {
        const stderr: string[] = [];
        const reader = fakeReader();
        const code = await main([...watch, "--review-bots", path], {
          ...harness(reader).runtime,
          stderr: (value) => stderr.push(value),
        });
        expect(code).toBe(64);
        expect(stderr.join("")).toContain("--review-bots");
        expect(stderr.join("")).toContain(path);
        expect(reader.calls).toEqual([]);
      }
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe("review-thread blocker output", () => {
  async function blocker(pretty: boolean) {
    const stdout: string[] = [];
    const reader = fakeReader({
      threadPages: [
        parseReviewThreadPage(sample.reviewThreads.coderabbitAndCubic),
      ],
    });
    const code = await main(
      ["--owner", "owner", "--repo", "repo", "--pr", "1", ...(pretty ? ["--pretty"] : [])],
      {
        reader,
        clock: { now: () => 0, observedAt: () => "now", sleep: async () => {} },
        stdout: (value) => stdout.push(value),
        stderr: () => {},
      }
    );
    return { code, text: stdout.join("") };
  }

  it("names each thread's review bot and that bot's pass count", async () => {
    const { code, text } = await blocker(true);
    expect(code).toBe(3);
    expect(text.split("\n").slice(3, 6)).toEqual([
      "T1 src/a.ts 10 cubic-dev-ai reviewBot=cubic reviewBotPasses=2 P3: Cubic finding 1.",
      "T2 src/b.ts 20 cubic-dev-ai reviewBot=cubic reviewBotPasses=2 P2: Cubic finding 2.",
      "T3 src/c.ts 30 coderabbitai reviewBot=coderabbit reviewBotPasses=1 _Potential issue_",
    ]);
  });

  it("carries the same fields in the JSON verdict", async () => {
    const { code, text } = await blocker(false);
    expect(code).toBe(3);
    const threads = JSON.parse(text).blocker.threads;
    expect(threads[2]).toMatchObject({
      reviewBot: "coderabbit",
      reviewBotPasses: 1,
      firstComment: { reviewedCommit: "3".repeat(40) },
    });
    expect(threads[2]).not.toHaveProperty("isBugbot");
  });
});

describe("review-bot config", () => {
  it.each([
    ["no bots list", {}],
    ["a bot without an id", { bots: [{ authors: [{ login: "x" }] }] }],
    ["a bot without authors", { bots: [{ id: "x", authors: [] }] }],
    [
      "duplicate ids",
      {
        bots: [
          { id: "x", authors: [{ login: "a" }] },
          { id: "x", authors: [{ login: "b" }] },
        ],
      },
    ],
    [
      "an unknown login match",
      { bots: [{ id: "x", authors: [{ login: "a", match: "regex" }] }] },
    ],
    [
      "a pass marker that is not a regular expression",
      {
        bots: [
          { id: "x", authors: [{ login: "a" }], passMarkers: [{ pattern: "(" }] },
        ],
      },
    ],
    [
      "a captured pass marker without a capture group",
      {
        bots: [
          { id: "x", authors: [{ login: "a" }], passMarkers: [{ pattern: "run" }] },
        ],
      },
    ],
    [
      "a login that is only a [bot] suffix",
      { bots: [{ id: "x", authors: [{ login: "[bot]", match: "contains" }] }] },
    ],
    [
      "an empty running-check name",
      { bots: [{ id: "x", authors: [{ login: "a" }], runningChecks: [""] }] },
    ],
    [
      "an empty body token",
      { bots: [{ id: "x", authors: [{ login: "a", bodyTokens: [" "] }] }] },
    ],
    [
      "an unknown pass key",
      {
        bots: [
          { id: "x", authors: [{ login: "a" }], passMarkers: [{ key: "author" }] },
        ],
      },
    ],
  ])("rejects %s", (_label, value) => {
    expect(() => parseReviewBots(value)).toThrow(ReviewBotConfigError);
  });
});

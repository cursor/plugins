import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CliRuntime, main } from "./cli.ts";
import { fakeReader, passingCheck, pendingCheck } from "./fakes.test-helper.ts";
import { buildReviewThreads } from "./github.ts";
import { ReviewBotConfigError, parseReviewBots } from "./review-bots.ts";
import type { GitHubReader, RawReviewThread, ReviewThread } from "./types.ts";

const thread = (
  id: string,
  login: string,
  body: string,
  resolved = false
): RawReviewThread => ({
  id,
  resolved,
  firstComment: {
    authorLogin: login,
    body,
    path: "a.ts",
    line: 1,
    createdAt: "now",
  },
});
const shipped = JSON.parse(
  readFileSync(new URL("./review-bots.json", import.meta.url), "utf8")
);
const withExampleBot = {
  bots: [
    ...shipped.bots,
    {
      id: "example",
      authors: [{ login: "example-reviewer[bot]" }],
      passMarkers: [{ pattern: "<!-- review-run=(\\w+) -->" }],
      runningChecks: ["Example Review"],
    },
  ],
};
const exampleBots = parseReviewBots(withExampleBot);
const passesByBot = (threads: readonly ReviewThread[]) =>
  Object.fromEntries(
    threads.map((item) => [String(item.reviewBot), item.reviewBotPasses])
  );

describe("review-bot detection", () => {
  const raw = [
    thread("b1", "cursor", "Bugbot RUN_ID: run-1"),
    thread("e1", "example-reviewer", "<!-- review-run=a1 -->\nFinding 1."),
    thread("e2", "example-reviewer", "<!-- review-run=b2 -->\nFinding 2."),
    thread("e3", "example-reviewer", "<!-- review-run=a1 -->\nOld.", true),
    thread("p1", "a-person", "Please rename this."),
  ];

  it("ships a default config that recognises only Bugbot", () => {
    expect(
      buildReviewThreads(raw).map((item) => [item.id, item.reviewBot])
    ).toEqual([
      ["b1", "bugbot"],
      ["e1", null],
      ["e2", null],
      ["p1", null],
    ]);
  });

  it("names each thread's bot from the config", () => {
    expect(
      buildReviewThreads(raw, exampleBots).map((item) => item.reviewBot)
    ).toEqual(["bugbot", "example", "example", null]);
  });

  it("counts passes per bot, including resolved threads", () => {
    expect(passesByBot(buildReviewThreads(raw, exampleBots))).toEqual({
      bugbot: 1,
      example: 2,
      null: 0,
    });
  });

  it("counts one pass for a bot whose findings carry no pass marker", () => {
    const keyless = [thread("e1", "example-reviewer", "Finding.")];
    expect(buildReviewThreads(keyless, exampleBots)[0]?.reviewBotPasses).toBe(
      1
    );
  });
});

describe("--review-bots", () => {
  const watch = ["--owner", "owner", "--repo", "repo", "--pr", "1"];
  function harness(reader: GitHubReader) {
    const stdout: string[] = [];
    const stderr: string[] = [];
    let now = 0;
    const runtime: CliRuntime = {
      reader,
      clock: {
        now: () => (now += 10),
        observedAt: () => "2026-11-02T00:00:00.000Z",
        sleep: async () => {},
      },
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
    };
    return {
      runtime,
      stderr,
      events: () => stdout.map((line) => JSON.parse(line)),
    };
  }
  function withConfigFile<R>(value: unknown, use: (path: string) => R): R {
    const dir = mkdtempSync(join(tmpdir(), "review-bots-"));
    const path = join(dir, "review-bots.json");
    writeFileSync(path, JSON.stringify(value));
    try {
      return use(path);
    } finally {
      rmSync(dir, { recursive: true });
    }
  }
  const exampleRunning = () =>
    fakeReader({
      fastPath: {
        kind: "checks",
        checks: [passingCheck(), pendingCheck("Example Review")],
      },
    });

  it("holds READY while a configured bot's check is running", async () => {
    await withConfigFile(withExampleBot, async (path) => {
      const run = harness(exampleRunning());
      expect(
        await main(
          [...watch, "--timeout", "5", "--review-bots", path],
          run.runtime
        )
      ).toBe(5);
      expect(run.events().map((event) => event.kind)).toEqual([
        "WAITING",
        "TIMEOUT",
      ]);
    });
  });

  it("flags review automation from the configured check names", async () => {
    const running = async (extra: readonly string[]) => {
      const run = harness(exampleRunning());
      await main([...watch, "--status-only", ...extra], run.runtime);
      return run.events()[0].rows[0].reviewAutomationRunning;
    };
    expect(await running([])).toBe(false);
    await withConfigFile(withExampleBot, async (path) => {
      expect(await running(["--review-bots", path])).toBe(true);
    });
  });

  it("prints each thread's bot and its pass count", async () => {
    await withConfigFile(withExampleBot, async (path) => {
      const stdout: string[] = [];
      const reader = fakeReader({
        threadPages: [
          {
            threads: [
              thread("e1", "example-reviewer", "<!-- review-run=a1 -->"),
            ],
            endCursor: null,
          },
        ],
      });
      const code = await main([...watch, "--pretty", "--review-bots", path], {
        ...harness(reader).runtime,
        stdout: (value) => stdout.push(value),
      });
      expect(code).toBe(3);
      expect(stdout.join("")).toContain(
        "e1 a.ts 1 example-reviewer reviewBot=example reviewBotPasses=1"
      );
    });
  });

  it("rejects an unreadable or invalid file as a usage error", async () => {
    await withConfigFile({ bots: [{ id: "x" }] }, async (invalid) => {
      for (const path of [invalid, `${invalid}.missing`]) {
        const reader = fakeReader();
        const run = harness(reader);
        expect(await main([...watch, "--review-bots", path], run.runtime)).toBe(
          64
        );
        expect(run.stderr.join("")).toContain(path);
        expect(reader.calls).toEqual([]);
      }
    });
  });
});

describe("review-bot config", () => {
  const bot = (fields: Record<string, unknown>) => ({
    bots: [{ id: "x", authors: [{ login: "a" }], ...fields }],
  });
  it.each([
    ["no bots list", {}],
    ["a bot without an id", { bots: [{ authors: [{ login: "a" }] }] }],
    ["a bot without authors", bot({ authors: [] })],
    [
      "duplicate ids",
      {
        bots: [
          { id: "x", authors: [{ login: "a" }] },
          { id: "x", authors: [{ login: "b" }] },
        ],
      },
    ],
    ["an unknown login match", bot({ authors: [{ login: "a", match: "re" }] })],
    [
      "a login that is only a [bot] suffix",
      bot({ authors: [{ login: "[bot]" }] }),
    ],
    [
      "an empty body token",
      bot({ authors: [{ login: "a", bodyTokens: [" "] }] }),
    ],
    [
      "a pass marker that is not a regex",
      bot({ passMarkers: [{ pattern: "(" }] }),
    ],
    [
      "a pass marker without a capture group",
      bot({ passMarkers: [{ pattern: "run" }] }),
    ],
    [
      "an unsupported pass marker key",
      bot({ passMarkers: [{ key: "commit", pattern: "(x)" }] }),
    ],
    ["an empty running-check name", bot({ runningChecks: [""] })],
  ])("rejects %s", (_label, value) => {
    expect(() => parseReviewBots(value)).toThrow(ReviewBotConfigError);
  });
});

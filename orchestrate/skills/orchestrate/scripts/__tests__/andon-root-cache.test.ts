import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { SlackAdapter, SlackMessageRef } from "../adapters/types.ts";
import { AndonPoller, SlackReactionAndonSource } from "../core/andon.ts";
import type { State } from "../schemas.ts";

function slackWithReactions(
  reactions: { name: string; users: string[] }[],
  threadReplies: { ts: string; text: string }[] = []
): SlackAdapter {
  return {
    async postRunKickoff(): Promise<SlackMessageRef> {
      throw new Error("not used");
    },
    async lookupFirstNameByEmail(): Promise<string | undefined> {
      return undefined;
    },
    async postInThread(): Promise<SlackMessageRef> {
      throw new Error("not used");
    },
    async editThreadMessage(): Promise<SlackMessageRef> {
      throw new Error("not used");
    },
    async uploadFileToThread(): Promise<{ fileId: string; permalink: string }> {
      throw new Error("not used");
    },
    async getReactions() {
      return { reactions };
    },
    async getThreadReplies() {
      return { messages: threadReplies };
    },
    async postCommentInThread(): Promise<SlackMessageRef> {
      throw new Error("not used");
    },
    async addReaction(): Promise<void> {
      throw new Error("not used");
    },
    async removeReaction(): Promise<void> {
      throw new Error("not used");
    },
  };
}

describe("SlackReactionAndonSource", () => {
  test("Reaction present returns active state", async () => {
    const source = new SlackReactionAndonSource(
      slackWithReactions(
        [{ name: "rotating_light", users: ["U123"] }],
        [
          { ts: "111.222", text: "orchestrate started" },
          { ts: "111.333", text: "unrelated" },
          {
            ts: "111.444",
            text: "🚨 ANDON RAISED by operator: upstream verifier is wrong",
          },
        ]
      ),
      { channel: "C123", ts: "111.222" }
    );

    const state = await source.snapshot();

    expect(state.active).toBe(true);
    if (state.active) {
      expect(state.raisedBy).toBe("U123");
      expect(state.reason).toBe("upstream verifier is wrong");
      expect(state.raisedAt).toBeTruthy();
      expect(state.lastCheckedAt).toBeTruthy();
    }
  });

  test("Reaction absent returns inactive snapshot", async () => {
    const source = new SlackReactionAndonSource(
      slackWithReactions([{ name: "eyes", users: ["U123"] }]),
      { channel: "C123", ts: "111.222" }
    );

    await expect(source.snapshot()).resolves.toMatchObject({
      active: false,
      lastCheckedAt: expect.any(String),
    });
  });

  test("Uses the newest Andon reason reply", async () => {
    const calls: { limit: number; latest?: string }[] = [];
    const source = new SlackReactionAndonSource(
      {
        ...slackWithReactions([{ name: "rotating_light", users: ["U123"] }]),
        async getThreadReplies(args) {
          calls.push({ limit: args.limit, latest: args.latest });
          return {
            messages: [
              { ts: "111.222", text: "orchestrate started" },
              {
                ts: "111.250",
                text: "🚨 ANDON RAISED by older: first reason",
              },
              {
                ts: "111.260",
                text: ":rotating_light: ANDON RAISED by newer: latest reason",
              },
              ...Array.from({ length: 18 }, (_, index) => ({
                ts: `111.${200 + index}`,
                text: `older reply ${index}`,
              })),
            ],
          };
        },
      },
      { channel: "C123", ts: "111.222" }
    );

    const state = await source.snapshot();

    expect(state).toMatchObject({
      active: true,
      reason: "latest reason",
    });
    expect(calls).toEqual([{ limit: 20, latest: expect.any(String) }]);
  });

  test("Keeps Andon active when reason reply fetch fails", async () => {
    const source = new SlackReactionAndonSource(
      {
        ...slackWithReactions([{ name: "rotating_light", users: ["U123"] }]),
        async getThreadReplies() {
          throw new Error("slack_replies_unavailable");
        },
      },
      { channel: "C123", ts: "111.222" }
    );

    await expect(source.snapshot()).resolves.toMatchObject({
      active: true,
      raisedBy: "U123",
    });
  });

  test("Strips the cursor.com observability footer from the parsed reason", async () => {
    const source = new SlackReactionAndonSource(
      slackWithReactions(
        [{ name: "rotating_light", users: ["U123"] }],
        [
          { ts: "111.222", text: "orchestrate started" },
          {
            ts: "111.444",
            text: "🚨 ANDON RAISED by operator: upstream verifier is wrong\n<https://cursor.com/agents/bc-abc|view>",
          },
        ]
      ),
      { channel: "C123", ts: "111.222" }
    );

    const state = await source.snapshot();

    if (!state.active) throw new Error("expected active andon snapshot");
    expect(state.reason).toBe("upstream verifier is wrong");
    expect(state.reason).not.toContain("cursor.com");
  });
});

describe("AndonPoller root cache", () => {
  test("Root polling refreshes lastCheckedAt while Andon stays raised", async () => {
    const state: State = {
      rootSlug: "root",
      tasks: [],
      attention: [],
    };
    let saves = 0;
    const saveReasons: (string | undefined)[] = [];
    let checks = 0;
    const poller = new AndonPoller({
      source: {
        async snapshot() {
          checks++;
          return {
            active: true,
            raisedAt: "2026-04-30T00:00:00.000Z",
            raisedBy: "U123",
            lastCheckedAt: `2026-04-30T00:00:0${checks}.000Z`,
          };
        },
      },
      getState: () => state,
      saveState: reason => {
        saves++;
        saveReasons.push(reason);
      },
      logAttention: () => {},
      pollSource: true,
    });

    await poller.drainEvents();
    const firstRaisedAt = state.andon?.raisedAt;
    await poller.drainEvents();

    expect(saves).toBe(2);
    expect(saveReasons).toEqual(["andon state changed", undefined]);
    expect(state.andon?.raisedAt).toBe(firstRaisedAt);
    expect(state.andon?.lastCheckedAt).toBe("2026-04-30T00:00:02.000Z");
  });

  test("Root polling refreshes lastCheckedAt after Andon is cleared", async () => {
    const state: State = {
      rootSlug: "root",
      tasks: [],
      attention: [],
      andon: {
        raisedAt: "2026-04-30T00:00:00.000Z",
        raisedBy: "U123",
        cleared: true,
        clearedAt: "2026-04-30T00:00:01.000Z",
        lastCheckedAt: "2026-04-30T00:00:01.000Z",
      },
    };
    let saves = 0;
    const poller = new AndonPoller({
      source: {
        async snapshot() {
          return {
            active: false,
            lastCheckedAt: "2026-04-30T00:00:02.000Z",
          };
        },
      },
      getState: () => state,
      saveState: () => {
        saves++;
      },
      logAttention: () => {},
      pollSource: true,
    });

    await poller.drainEvents();

    expect(saves).toBe(1);
    expect(state.andon?.clearedAt).toBe("2026-04-30T00:00:01.000Z");
    expect(state.andon?.lastCheckedAt).toBe("2026-04-30T00:00:02.000Z");
  });

  test("Subplanners read cached state without polling Slack", async () => {
    const state: State = {
      rootSlug: "child",
      tasks: [],
      attention: [],
      andon: {
        raisedAt: "2026-04-30T00:00:00.000Z",
        raisedBy: "root",
        reason: "bad upstream",
        cleared: false,
        lastCheckedAt: "2026-04-30T00:00:00.000Z",
      },
    };
    const poller = new AndonPoller({
      source: new SlackReactionAndonSource(
        slackWithReactions([{ name: "rotating_light", users: ["U123"] }]),
        { channel: "C123", ts: "111.222" }
      ),
      getState: () => state,
      saveState: () => {},
      logAttention: () => {},
      pollSource: false,
    });

    await poller.drainEvents();

    expect(poller.isActive()).toBe(true);
  });

  test("Subplanners sync cached root Andon state from git", async () => {
    const repo = mkdtempSync(join(tmpdir(), "orch-andon-cache-"));
    const origin = mkdtempSync(join(tmpdir(), "orch-andon-origin-"));
    const workspace = join(repo, ".orchestrate", "child");
    const rootStatePath = join(repo, ".orchestrate", "root", "state.json");
    const git = (args: string[], cwd = repo) =>
      execFileSync("git", args, { cwd, stdio: "pipe" });
    try {
      git(["init", "-b", "main"]);
      git(["config", "user.email", "orchestrate@example.com"]);
      git(["config", "user.name", "Orchestrate Test"]);
      execFileSync("git", ["init", "--bare"], { cwd: origin, stdio: "pipe" });
      git(["remote", "add", "origin", origin]);
      mkdirSync(join(repo, ".orchestrate", "root"), { recursive: true });
      mkdirSync(workspace, { recursive: true });
      writeFileSync(
        rootStatePath,
        JSON.stringify(
          {
            rootSlug: "root",
            tasks: [],
            attention: [],
            andon: {
              raisedAt: "2026-04-30T00:00:00.000Z",
              raisedBy: "root",
              reason: "stop",
              cleared: false,
              lastCheckedAt: "2026-04-30T00:00:00.000Z",
            },
          },
          null,
          2
        )
      );
      git(["add", ".orchestrate/root/state.json"]);
      git(["commit", "-m", "root state"]);
      git(["push", "-u", "origin", "main"]);

      const state: State = {
        rootSlug: "child",
        tasks: [],
        attention: [],
      };
      const poller = new AndonPoller({
        getState: () => state,
        saveState: () => {},
        logAttention: line =>
          state.attention.push({ at: new Date().toISOString(), message: line }),
        pollSource: false,
        cachedState: {
          workspace,
          ref: "main",
          path: ".orchestrate/root/state.json",
        },
      });

      await poller.drainEvents();

      expect(poller.isActive()).toBe(true);
      expect(state.andon?.reason).toBe("stop");
      expect(state.attention).toHaveLength(0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(origin, { recursive: true, force: true });
    }
  });

  test("Rejects malformed cached Andon state instead of marking active", async () => {
    const repo = mkdtempSync(join(tmpdir(), "orch-andon-malformed-"));
    const origin = mkdtempSync(join(tmpdir(), "orch-andon-malformed-origin-"));
    const workspace = join(repo, ".orchestrate", "child");
    const rootStatePath = join(repo, ".orchestrate", "root", "state.json");
    const git = (args: string[], cwd = repo) =>
      execFileSync("git", args, { cwd, stdio: "pipe" });
    try {
      git(["init", "-b", "main"]);
      git(["config", "user.email", "orchestrate@example.com"]);
      git(["config", "user.name", "Orchestrate Test"]);
      execFileSync("git", ["init", "--bare"], { cwd: origin, stdio: "pipe" });
      git(["remote", "add", "origin", origin]);
      mkdirSync(join(repo, ".orchestrate", "root"), { recursive: true });
      mkdirSync(workspace, { recursive: true });
      writeFileSync(
        rootStatePath,
        JSON.stringify({
          rootSlug: "root",
          tasks: [],
          attention: [],
          andon: {
            raisedAt: 1234567890,
            cleared: "no",
            lastCheckedAt: "2026-04-30T00:00:00.000Z",
          },
        })
      );
      git(["add", ".orchestrate/root/state.json"]);
      git(["commit", "-m", "malformed state"]);
      git(["push", "-u", "origin", "main"]);

      const state: State = {
        rootSlug: "child",
        tasks: [],
        attention: [],
      };
      const poller = new AndonPoller({
        getState: () => state,
        saveState: () => {},
        logAttention: line =>
          state.attention.push({ at: new Date().toISOString(), message: line }),
        pollSource: false,
        cachedState: {
          workspace,
          ref: "main",
          path: ".orchestrate/root/state.json",
        },
      });

      await poller.drainEvents();

      expect(poller.isActive()).toBe(false);
      expect(state.andon).toBeUndefined();
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(origin, { recursive: true, force: true });
    }
  });
});

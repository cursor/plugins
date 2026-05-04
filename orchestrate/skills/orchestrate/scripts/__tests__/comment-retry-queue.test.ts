import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { SlackAdapter, SlackMessageRef } from "../adapters/types.ts";
const TEST_SLACK_CHANNEL = "C123TEST";
import {
  commentRetryQueuePath,
  drainCommentRetryQueue,
  postOrQueueComment,
} from "../core/comment-retry-queue.ts";

interface SlackPost {
  threadTs: string;
  text: string;
  username?: string;
  clientMsgId?: string;
}

function slackAdapter(args: {
  failures?: number;
  posts: SlackPost[];
}): SlackAdapter {
  let calls = 0;
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
    async getReactions(): Promise<{
      reactions: { name: string; users: string[] }[];
    }> {
      throw new Error("not used");
    },
    async getThreadReplies(): Promise<{
      messages: { ts: string; text: string }[];
    }> {
      throw new Error("not used");
    },
    async postCommentInThread(commentArgs): Promise<SlackMessageRef> {
      calls++;
      if (calls <= (args.failures ?? 0)) throw new Error("slack_unavailable");
      args.posts.push({
        threadTs: commentArgs.threadTs,
        text: commentArgs.text,
        username: commentArgs.username,
        clientMsgId: commentArgs.clientMsgId,
      });
      return { channel: TEST_SLACK_CHANNEL, ts: String(calls) };
    },
    async addReaction(): Promise<void> {
      throw new Error("not used");
    },
    async removeReaction(): Promise<void> {
      throw new Error("not used");
    },
  };
}

function alwaysFailingSlack(): SlackAdapter {
  return slackAdapter({ failures: Number.POSITIVE_INFINITY, posts: [] });
}

describe("required comment retry queue", () => {
  test("Persists failed required Slack comment and retries it later", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-queue-"));
    const posts: SlackPost[] = [];
    try {
      const slack = slackAdapter({ failures: 1, posts });
      const first = await postOrQueueComment({
        destinations: { slack },
        workspace,
        destination: `slack:${TEST_SLACK_CHANNEL}:111.222`,
        body: "please review",
        sender: "agent",
        criticality: "required",
      });

      expect(first).toBe("queued");
      expect(
        JSON.parse(readFileSync(commentRetryQueuePath(workspace), "utf8"))
      ).toHaveLength(1);

      const queue = JSON.parse(
        readFileSync(commentRetryQueuePath(workspace), "utf8")
      );
      const firstDelayMs =
        Date.parse(queue[0].nextAttemptAt) - Date.parse(queue[0].createdAt);
      expect(firstDelayMs).toBeLessThan(5_000);
      expect(firstDelayMs).toBeGreaterThanOrEqual(0);
      queue[0].nextAttemptAt = "1970-01-01T00:00:00.000Z";
      writeFileSync(
        commentRetryQueuePath(workspace),
        JSON.stringify(queue, null, 2)
      );

      const retry = await drainCommentRetryQueue({
        workspace,
        destinations: { slack },
      });
      expect(retry.posted).toBe(1);
      expect(posts.map(post => post.text)).toEqual(["please review"]);
      expect(
        JSON.parse(readFileSync(commentRetryQueuePath(workspace), "utf8"))
      ).toHaveLength(0);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Reports queued when an older queued entry consumes the single drain slot", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-queue-fifo-"));
    const posts: SlackPost[] = [];
    try {
      writeFileSync(
        commentRetryQueuePath(workspace),
        JSON.stringify(
          [
            {
              id: "older-entry",
              destination: `slack:${TEST_SLACK_CHANNEL}:111.222`,
              body: "older comment",
              sender: "agent",
              attempts: 1,
              createdAt: "1970-01-01T00:00:00.000Z",
              nextAttemptAt: "1970-01-01T00:00:00.000Z",
            },
          ],
          null,
          2
        )
      );
      const result = await postOrQueueComment({
        destinations: { slack: slackAdapter({ posts }) },
        workspace,
        destination: `slack:${TEST_SLACK_CHANNEL}:111.222`,
        body: "new comment",
        sender: "agent",
        criticality: "required",
      });
      expect(result).toBe("queued");
      expect(posts.map(post => post.text)).toEqual(["older comment"]);
      const remaining = JSON.parse(
        readFileSync(commentRetryQueuePath(workspace), "utf8")
      );
      expect(remaining).toHaveLength(1);
      expect(remaining[0].body).toBe("new comment");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Reports queued when dedup hits a near-cap entry that exhausts on this drain", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-queue-cap-"));
    try {
      writeFileSync(
        commentRetryQueuePath(workspace),
        JSON.stringify(
          [
            {
              id: "near-cap-entry",
              destination: `slack:${TEST_SLACK_CHANNEL}:111.222`,
              body: "@reviewer please look",
              sender: "agent",
              attempts: 4,
              createdAt: "1970-01-01T00:00:00.000Z",
              nextAttemptAt: "1970-01-01T00:00:00.000Z",
              lastError: "previous failure",
            },
          ],
          null,
          2
        )
      );
      const result = await postOrQueueComment({
        destinations: { slack: alwaysFailingSlack() },
        workspace,
        destination: `slack:${TEST_SLACK_CHANNEL}:111.222`,
        body: "@reviewer please look",
        sender: "agent",
        criticality: "required",
      });
      expect(result).toBe("queued");
      const remaining = JSON.parse(
        readFileSync(commentRetryQueuePath(workspace), "utf8")
      );
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("near-cap-entry");
      expect(typeof remaining[0].exhaustedAt).toBe("string");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Routes Slack thread destinations through the adapter", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-queue-slack-"));
    const posts: SlackPost[] = [];
    const slack = slackAdapter({ failures: 1, posts });
    try {
      const result = await postOrQueueComment({
        destinations: { slack },
        workspace,
        destination: `slack:${TEST_SLACK_CHANNEL}:111.222`,
        body: "please review",
        sender: "worker-one",
        criticality: "required",
      });

      expect(result).toBe("queued");
      const queue = JSON.parse(
        readFileSync(commentRetryQueuePath(workspace), "utf8")
      );
      queue[0].nextAttemptAt = "1970-01-01T00:00:00.000Z";
      writeFileSync(
        commentRetryQueuePath(workspace),
        JSON.stringify(queue, null, 2)
      );

      const retry = await drainCommentRetryQueue({
        workspace,
        destinations: { slack },
      });
      expect(retry.posted).toBe(1);
      expect(posts).toEqual([
        {
          threadTs: "111.222",
          text: "please review",
          username: "worker-one",
          clientMsgId: queue[0].id,
        },
      ]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Rejects slack: destinations outside allowedSlackThread", async () => {
    const posts: SlackPost[] = [];
    const slack = slackAdapter({ posts });

    await expect(
      postOrQueueComment({
        destinations: { slack },
        destination: "slack:DM:U_OPERATOR",
        body: "exfil attempt",
        sender: "worker",
        criticality: "best_effort",
        allowedSlackThread: {
          channel: TEST_SLACK_CHANNEL,
          threadTs: "111.222",
        },
      })
    ).rejects.toThrow(/not DMs/);
    expect(posts).toEqual([]);
  });

  test("Rejects slack: destinations with a sibling-run threadTs", async () => {
    const posts: SlackPost[] = [];
    const slack = slackAdapter({ posts });

    await expect(
      postOrQueueComment({
        destinations: { slack },
        destination: `slack:${TEST_SLACK_CHANNEL}:999.000`,
        body: "redirect attempt",
        sender: "worker",
        criticality: "best_effort",
        allowedSlackThread: {
          channel: TEST_SLACK_CHANNEL,
          threadTs: "111.222",
        },
      })
    ).rejects.toThrow(/outside this workspace's run thread/);
    expect(posts).toEqual([]);
  });

  test("Rejects slack: destinations at the channel root", async () => {
    const posts: SlackPost[] = [];
    const slack = slackAdapter({ posts });

    await expect(
      postOrQueueComment({
        destinations: { slack },
        destination: `slack:${TEST_SLACK_CHANNEL}`,
        body: "channel-root attempt",
        sender: "worker",
        criticality: "best_effort",
        allowedSlackThread: {
          channel: TEST_SLACK_CHANNEL,
          threadTs: "111.222",
        },
      })
    ).rejects.toThrow(/must include a thread_ts/);
    expect(posts).toEqual([]);
  });

  test("Drain re-validates queued entries against allowedSlackThread", async () => {
    const workspace = mkdtempSync(
      join(tmpdir(), "orch-comment-queue-drain-bypass-")
    );
    const posts: SlackPost[] = [];
    try {
      // Bypass enqueue-time validation and check the drain guard.
      writeFileSync(
        commentRetryQueuePath(workspace),
        JSON.stringify(
          [
            {
              id: "exfil-attempt",
              destination: "slack:DM:U_OPERATOR",
              body: "redirect to operator DM",
              sender: "worker",
              attempts: 0,
              createdAt: "1970-01-01T00:00:00.000Z",
              nextAttemptAt: "1970-01-01T00:00:00.000Z",
            },
          ],
          null,
          2
        )
      );

      const result = await drainCommentRetryQueue({
        workspace,
        destinations: { slack: slackAdapter({ posts }) },
        allowedSlackThread: {
          channel: TEST_SLACK_CHANNEL,
          threadTs: "111.222",
        },
      });

      expect(result.posted).toBe(0);
      expect(posts).toEqual([]);
      const remaining = JSON.parse(
        readFileSync(commentRetryQueuePath(workspace), "utf8")
      );
      expect(remaining).toHaveLength(1);
      expect(remaining[0].lastError).toMatch(/not DMs/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Allows slack: destinations matching allowedSlackThread", async () => {
    const posts: SlackPost[] = [];
    const slack = slackAdapter({ posts });

    await postOrQueueComment({
      destinations: { slack },
      destination: `slack:${TEST_SLACK_CHANNEL}:111.222`,
      body: "ok",
      sender: "worker",
      criticality: "best_effort",
      allowedSlackThread: {
        channel: TEST_SLACK_CHANNEL,
        threadTs: "111.222",
      },
    });

    expect(posts).toMatchObject([{ threadTs: "111.222", text: "ok" }]);
  });

  test("Rejects non-Slack destinations with a clear error", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-queue-bad-"));
    try {
      await expect(
        postOrQueueComment({
          destinations: { slack: slackAdapter({ posts: [] }) },
          workspace,
          destination: "linear:PROJ-1",
          body: "should not post",
          sender: "agent",
          criticality: "best_effort",
        })
      ).rejects.toThrow(/only slack:/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

import { afterAll, describe, expect, test } from "bun:test";

import {
  installSlackWebApiMock,
  resetSlackWebApiMock,
  slackPlatformError,
  slackWebApiCalls,
} from "./support/slack-web-api-mock.ts";

installSlackWebApiMock();

const { createSlackAdapter } = await import("../adapters/index.ts");
const TEST_SLACK_CHANNEL = "C123TEST";

const ORIGINAL_SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
process.env.SLACK_BOT_TOKEN = "xoxb-test";

afterAll(() => {
  if (ORIGINAL_SLACK_TOKEN === undefined) {
    delete process.env.SLACK_BOT_TOKEN;
  } else {
    process.env.SLACK_BOT_TOKEN = ORIGINAL_SLACK_TOKEN;
  }
});

function adapter(
  handler?: (
    method: string,
    args: Record<string, unknown>
  ) => Promise<unknown> | unknown
): NonNullable<ReturnType<typeof createSlackAdapter>> {
  resetSlackWebApiMock(handler);
  const slack = createSlackAdapter(TEST_SLACK_CHANNEL);
  if (!slack) {
    throw new Error("expected createSlackAdapter to return a client");
  }
  return slack;
}

describe("SlackApiAdapter", () => {
  test("Posts kickoff and task messages with icon_url forwarded to Slack", async () => {
    const slack = adapter();

    const kickoff = await slack.postRunKickoff({
      text: "`root`: ship it",
      username: "operator's bot",
      iconUrl: "https://example.test/kickoff.png",
    });
    const task = await slack.postInThread({
      threadTs: kickoff.ts,
      username: "worker-one",
      iconUrl: "https://example.test/worker.png",
      text: "running",
    });

    const calls = slackWebApiCalls();
    expect(kickoff).toEqual({
      channel: TEST_SLACK_CHANNEL,
      ts: "111.222",
    });
    expect(task).toEqual({
      channel: TEST_SLACK_CHANNEL,
      ts: "111.222",
    });
    expect(calls.map(call => call.method)).toEqual([
      "chat.postMessage",
      "chat.postMessage",
    ]);
    expect(typeof calls[0].args.client_msg_id).toBe("string");
    expect(calls[0].args).toMatchObject({
      channel: TEST_SLACK_CHANNEL,
      text: "`root`: ship it",
      username: "operator's bot",
      icon_url: "https://example.test/kickoff.png",
    });
    expect(calls[0].args.icon_emoji).toBeUndefined();
    expect(typeof calls[1].args.client_msg_id).toBe("string");
    expect(calls[1].args).toMatchObject({
      channel: TEST_SLACK_CHANNEL,
      thread_ts: "111.222",
      username: "worker-one",
      icon_url: "https://example.test/worker.png",
      text: "running",
    });
    expect(calls[1].args.icon_emoji).toBeUndefined();
  });

  test("icon_url wins when both iconUrl and iconEmoji are set", async () => {
    const slack = adapter();
    await slack.postInThread({
      threadTs: "111.222",
      username: "worker-one",
      iconUrl: "https://example.test/worker.png",
      iconEmoji: ":robot_face:",
      text: "running",
    });
    const [call] = slackWebApiCalls();
    expect(call.args.icon_url).toBe("https://example.test/worker.png");
    expect(call.args.icon_emoji).toBeUndefined();
  });

  test("Falls back to icon_emoji when iconUrl is unset", async () => {
    const slack = adapter();
    await slack.postInThread({
      threadTs: "111.222",
      username: "worker-one",
      iconEmoji: ":robot_face:",
      text: "running",
    });
    const [call] = slackWebApiCalls();
    expect(call.args.icon_emoji).toBe(":robot_face:");
    expect(call.args.icon_url).toBeUndefined();
  });

  test("Looks up first name by email, falling back gracefully", async () => {
    let returnPayload: unknown = {
      ok: true,
      user: { profile: { first_name: "Alex", real_name: "Alex Doe" } },
    };
    const slack = adapter((method, _args) => {
      expect(method).toBe("users.lookupByEmail");
      const value = returnPayload;
      if (value instanceof Error) throw value;
      return value;
    });

    await expect(
      slack.lookupFirstNameByEmail("user@example.com")
    ).resolves.toBe("Alex");

    returnPayload = {
      ok: true,
      user: { profile: { real_name: "  Alex Doe  " } },
    };
    await expect(
      slack.lookupFirstNameByEmail("user@example.com")
    ).resolves.toBe("Alex");

    returnPayload = { ok: true, user: { name: "alex" } };
    await expect(
      slack.lookupFirstNameByEmail("user@example.com")
    ).resolves.toBe("alex");

    returnPayload = new Error("users_not_found");
    await expect(
      slack.lookupFirstNameByEmail("user@example.com")
    ).resolves.toBeUndefined();

    returnPayload = { ok: true, user: undefined };
    await expect(
      slack.lookupFirstNameByEmail("user@example.com")
    ).resolves.toBeUndefined();
  });

  test("Edits existing task messages", async () => {
    await expect(
      adapter().editThreadMessage({
        threadTs: "111.222",
        ts: "333.444",
        text: "done",
      })
    ).resolves.toEqual({
      channel: TEST_SLACK_CHANNEL,
      ts: "333.444",
    });
    expect(slackWebApiCalls()).toEqual([
      {
        method: "chat.update",
        args: {
          channel: TEST_SLACK_CHANNEL,
          ts: "333.444",
          text: "done",
        },
      },
    ]);
  });

  test("Uploads files", async () => {
    const slack = adapter((method, args) => {
      expect(method).toBe("files.uploadV2");
      expect(args).toMatchObject({
        channel_id: TEST_SLACK_CHANNEL,
        thread_ts: "111.222",
        filename: "result.txt",
        title: "result.txt",
        initial_comment: "artifact",
      });
      expect(args.file).toBeInstanceOf(Buffer);
      return {
        ok: true,
        files: [
          {
            ok: true,
            files: [{ id: "F123", permalink: "https://slack.test/file" }],
          },
        ],
      };
    });

    const uploaded = await slack.uploadFileToThread({
      threadTs: "111.222",
      filename: "result.txt",
      content: new TextEncoder().encode("hello"),
      initialComment: "artifact",
    });

    expect(uploaded).toEqual({
      fileId: "F123",
      permalink: "https://slack.test/file",
    });
    expect(slackWebApiCalls().map(call => call.method)).toEqual([
      "files.uploadV2",
    ]);
  });

  test("Reads reactions and posts comments", async () => {
    const slack = adapter((method, args) => {
      if (method === "reactions.get") {
        expect(args).toMatchObject({
          channel: "C123",
          timestamp: "111.222",
          full: true,
        });
        return {
          ok: true,
          message: {
            reactions: [{ name: "rotating_light", users: ["U123"] }],
          },
        };
      }
      expect(method).toBe("chat.postMessage");
      expect(args).toMatchObject({
        channel: TEST_SLACK_CHANNEL,
        thread_ts: "111.222",
        text: "note",
        username: "worker-one",
        client_msg_id: "comment-1",
      });
      return { ok: true, channel: TEST_SLACK_CHANNEL, ts: "555.666" };
    });

    await expect(
      slack.getReactions({ channel: "C123", ts: "111.222" })
    ).resolves.toEqual({
      reactions: [{ name: "rotating_light", users: ["U123"] }],
    });
    await expect(
      slack.postCommentInThread({
        threadTs: "111.222",
        text: "note",
        username: "worker-one",
        clientMsgId: "comment-1",
      })
    ).resolves.toEqual({
      channel: TEST_SLACK_CHANNEL,
      ts: "555.666",
    });
    expect(slackWebApiCalls()[0].method).toBe("reactions.get");
  });

  test("Thread-only methods require threadTs at the type boundary", () => {
    type Slack = NonNullable<ReturnType<typeof createSlackAdapter>>;
    const typeCheckOnly = (slack: Slack) => {
      // @ts-expect-error post-kickoff writes must include threadTs.
      void slack.postInThread({
        username: "worker-one",
        text: "running",
      });
      // @ts-expect-error comments cannot fall back to the channel root.
      void slack.postCommentInThread({
        text: "note",
      });
      // @ts-expect-error uploads cannot fall back to the channel root.
      void slack.uploadFileToThread({
        filename: "result.txt",
        content: new Uint8Array(),
      });
    };
    expect(typeCheckOnly).toBeTypeOf("function");
  });

  test("Reads thread replies", async () => {
    const slack = adapter((method, args) => {
      expect(method).toBe("conversations.replies");
      expect(args).toMatchObject({
        channel: "C123",
        ts: "111.222",
        limit: 20,
        cursor: "page-2",
        inclusive: true,
      });
      return {
        ok: true,
        messages: [
          { ts: "111.222", text: "root" },
          { ts: "111.333", text: "reply" },
        ],
        response_metadata: { next_cursor: "page-3" },
      };
    });

    await expect(
      slack.getThreadReplies({
        channel: "C123",
        ts: "111.222",
        limit: 20,
        cursor: "page-2",
      })
    ).resolves.toEqual({
      messages: [
        { ts: "111.222", text: "root" },
        { ts: "111.333", text: "reply" },
      ],
      nextCursor: "page-3",
    });
  });

  test("Andon reaction add/remove are idempotent", async () => {
    const errors = ["already_reacted", "no_reaction"];
    let call = 0;
    const slack = adapter(() => {
      throw slackPlatformError(errors[call++] ?? "unexpected");
    });

    await expect(
      slack.addReaction({
        channel: "C123",
        ts: "111.222",
        name: "rotating_light",
      })
    ).resolves.toBeUndefined();
    await expect(
      slack.removeReaction({
        channel: "C123",
        ts: "111.222",
        name: "rotating_light",
      })
    ).resolves.toBeUndefined();
  });

  test("Andon reaction add still surfaces non-benign errors", async () => {
    const slack = adapter(() => {
      throw slackPlatformError("channel_not_found");
    });
    await expect(
      slack.addReaction({
        channel: "C123",
        ts: "111.222",
        name: "rotating_light",
      })
    ).rejects.toThrow(/channel_not_found/);
  });
});

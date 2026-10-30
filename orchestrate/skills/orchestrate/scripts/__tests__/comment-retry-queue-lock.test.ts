import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { SlackAdapter, SlackMessageRef } from "../adapters/types.ts";
import {
  commentRetryQueuePath,
  postOrQueueComment,
} from "../core/comment-retry-queue.ts";

const TEST_SLACK_CHANNEL = "C123TEST";

// Slack is down for everyone. The first post hangs for a moment so that a
// second caller reads and writes the queue file while the first is waiting.
function slowThenFailingSlack(): SlackAdapter {
  let calls = 0;
  const notUsed = async (): Promise<never> => {
    throw new Error("not used");
  };
  return {
    postRunKickoff: notUsed,
    lookupFirstNameByEmail: async () => undefined,
    postInThread: notUsed,
    editThreadMessage: notUsed,
    uploadFileToThread: notUsed,
    getReactions: notUsed,
    getThreadReplies: notUsed,
    async postCommentInThread(): Promise<SlackMessageRef> {
      calls++;
      if (calls === 1) await new Promise(resolve => setTimeout(resolve, 60));
      throw new Error("slack_unavailable");
    },
    addReaction: notUsed,
    removeReaction: notUsed,
  };
}

describe("required comment retry queue under concurrent callers", () => {
  // Two required comments posted at the same time, as two local workers (or the
  // orchestrator and a worker) do at a handoff.
  test("Neither entry is lost and neither caller reports a comment it never delivered", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-queue-lock-"));
    try {
      const slack = slowThenFailingSlack();
      const destination = `slack:${TEST_SLACK_CHANNEL}:111.222`;
      const first = postOrQueueComment({
        destinations: { slack },
        workspace,
        destination,
        body: "first worker is done",
        sender: "worker-1",
        criticality: "required",
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      const second = postOrQueueComment({
        destinations: { slack },
        workspace,
        destination,
        body: "second worker is done",
        sender: "worker-2",
        criticality: "required",
      });
      const results = await Promise.all([first, second]);

      const queue = JSON.parse(
        readFileSync(commentRetryQueuePath(workspace), "utf8")
      ) as { body: string }[];
      expect(queue.map(entry => entry.body).sort()).toEqual([
        "first worker is done",
        "second worker is done",
      ]);
      expect(results).toEqual(["queued", "queued"]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  resolveKickoffSlackChannelOrBail,
  resolveWorkspaceSlackChannelOrBail,
} from "../cli/util.ts";

const ORIGINAL_SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const ORIGINAL_SLACK_CHANNEL = process.env.SLACK_CHANNEL_ID;

afterEach(() => {
  if (ORIGINAL_SLACK_TOKEN === undefined) delete process.env.SLACK_BOT_TOKEN;
  else process.env.SLACK_BOT_TOKEN = ORIGINAL_SLACK_TOKEN;
  if (ORIGINAL_SLACK_CHANNEL === undefined) delete process.env.SLACK_CHANNEL_ID;
  else process.env.SLACK_CHANNEL_ID = ORIGINAL_SLACK_CHANNEL;
});

describe("Slack channel boundary", () => {
  test("Token set without a channel fails before Slack initialization", () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    delete process.env.SLACK_CHANNEL_ID;

    expect(() => resolveKickoffSlackChannelOrBail(undefined)).toThrow(
      "set --slack-channel or SLACK_CHANNEL_ID, or unset SLACK_BOT_TOKEN to disable Slack"
    );
  });

  test("No token and no channel leaves Slack disabled", () => {
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_CHANNEL_ID;

    expect(resolveKickoffSlackChannelOrBail(undefined)).toBeUndefined();
  });

  test("No token with a channel accepts the channel for later plan persistence", () => {
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_CHANNEL_ID;

    expect(resolveKickoffSlackChannelOrBail("C123TEST")).toBe("C123TEST");
  });

  test("Workspace run inherits plan.slackChannel", () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    delete process.env.SLACK_CHANNEL_ID;
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-channel-"));
    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify({
          goal: "channel inheritance",
          rootSlug: "channel-inheritance",
          baseBranch: "main",
          repoUrl: "https://github.com/example-org/example-repo",
          slackChannel: "C123TEST",
          tasks: [
            {
              name: "worker-one",
              type: "worker",
              scopedGoal: "Do the work.",
            },
          ],
        })
      );

      expect(
        resolveWorkspaceSlackChannelOrBail({ workspace, explicit: undefined })
      ).toBe("C123TEST");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

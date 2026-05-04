import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadKickoffThreadTsOrBail } from "../cli/comments.ts";
const TEST_SLACK_CHANNEL = "C123TEST";

const CLI_PATH = new URL("../cli.ts", import.meta.url).pathname;
const SCRIPTS_DIR = new URL("..", import.meta.url).pathname;

describe("comment CLI", () => {
  test("Refuses to post without --task or --thread-ts", () => {
    const result = spawnSync(process.execPath, [CLI_PATH, "comment", "hello"], {
      cwd: SCRIPTS_DIR,
      encoding: "utf8",
      env: {
        ...process.env,
        SLACK_BOT_TOKEN: "xoxb-test",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "comment requires --task <name> or --thread-ts <ts>"
    );
  });

  test("Rejects explicit thread-ts outside the workspace run thread", () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-cli-"));
    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "guard comment",
            rootSlug: "guard-comment",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackChannel: TEST_SLACK_CHANNEL,
            slackKickoffRef: {
              channel: TEST_SLACK_CHANNEL,
              ts: "111.222",
            },
            tasks: [
              {
                name: "worker-one",
                type: "worker",
                scopedGoal: "Do the work.",
              },
            ],
          },
          null,
          2
        )
      );

      const result = spawnSync(
        process.execPath,
        [
          CLI_PATH,
          "comment",
          "hello",
          "--thread-ts",
          "999.000",
          "--workspace",
          workspace,
        ],
        {
          cwd: SCRIPTS_DIR,
          encoding: "utf8",
          env: {
            ...process.env,
            SLACK_BOT_TOKEN: "xoxb-test",
          },
        }
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("outside this workspace's run thread");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Rejects unsafe body before posting", () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-cli-body-"));
    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "guard comment",
            rootSlug: "guard-comment",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackChannel: TEST_SLACK_CHANNEL,
            slackKickoffRef: {
              channel: TEST_SLACK_CHANNEL,
              ts: "111.222",
            },
            tasks: [
              {
                name: "worker-one",
                type: "worker",
                scopedGoal: "Do the work.",
              },
            ],
          },
          null,
          2
        )
      );

      const result = spawnSync(
        process.execPath,
        [
          CLI_PATH,
          "comment",
          "/workspace/app/src/foo.ts",
          "--thread-ts",
          "111.222",
          "--workspace",
          workspace,
        ],
        {
          cwd: SCRIPTS_DIR,
          encoding: "utf8",
          env: {
            ...process.env,
            SLACK_BOT_TOKEN: "xoxb-test",
          },
        }
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("comment body refused");
      expect(result.stderr).toContain("contains /workspace path");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Requires plan.slackChannel for explicit thread-ts posts", () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-comment-cli-channel-"));
    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "guard comment",
            rootSlug: "guard-comment",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackKickoffRef: {
              channel: TEST_SLACK_CHANNEL,
              ts: "111.222",
            },
            tasks: [
              {
                name: "worker-one",
                type: "worker",
                scopedGoal: "Do the work.",
              },
            ],
          },
          null,
          2
        )
      );

      const result = spawnSync(
        process.execPath,
        [
          CLI_PATH,
          "comment",
          "hello",
          "--thread-ts",
          "111.222",
          "--workspace",
          workspace,
        ],
        {
          cwd: SCRIPTS_DIR,
          encoding: "utf8",
          env: {
            ...process.env,
            SLACK_BOT_TOKEN: "xoxb-test",
          },
        }
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "comments require a workspace with a plan that has plan.slackChannel set"
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

describe("loadKickoffThreadTsOrBail", () => {
  // Regression for Bugbot finding: operator-mode `--task` previously returned
  // task.slackTs (a reply's ts); the new helper reads plan.slackKickoffRef.ts
  // (the kickoff thread root) regardless of operator mode.
  test("returns plan.slackKickoffRef.ts", () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-kickoff-"));
    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify({
          goal: "kickoff thread",
          rootSlug: "kickoff-thread",
          baseBranch: "main",
          repoUrl: "https://github.com/example-org/example-repo",
          slackChannel: TEST_SLACK_CHANNEL,
          slackKickoffRef: {
            channel: TEST_SLACK_CHANNEL,
            ts: "111.222",
          },
          tasks: [
            { name: "worker-one", type: "worker", scopedGoal: "Do work." },
          ],
        })
      );
      expect(
        loadKickoffThreadTsOrBail({ workspace, taskName: "worker-one" })
      ).toBe("111.222");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("throws when plan.json is missing", () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-kickoff-missing-"));
    try {
      expect(() =>
        loadKickoffThreadTsOrBail({ workspace, taskName: "worker-one" })
      ).toThrow(/plan\.json with slackKickoffRef/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("throws when slackKickoffRef is absent", () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-kickoff-no-ref-"));
    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify({
          goal: "no kickoff",
          rootSlug: "no-kickoff",
          baseBranch: "main",
          repoUrl: "https://github.com/example-org/example-repo",
          slackChannel: TEST_SLACK_CHANNEL,
          tasks: [
            { name: "worker-one", type: "worker", scopedGoal: "Do work." },
          ],
        })
      );
      expect(() =>
        loadKickoffThreadTsOrBail({ workspace, taskName: "worker-one" })
      ).toThrow(/no slackKickoffRef/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

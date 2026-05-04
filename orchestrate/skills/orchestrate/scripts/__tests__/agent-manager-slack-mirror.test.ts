import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_SLACK_CHANNEL = "C123TEST";
import type { State } from "../schemas.ts";
import {
  installSlackWebApiMock,
  resetSlackWebApiMock,
  slackWebApiCalls,
} from "./support/slack-web-api-mock.ts";

installSlackWebApiMock();

const { AgentManager } = await import("../core/agent-manager.ts");

const ORIGINAL_API_KEY = process.env.CURSOR_API_KEY;
const ORIGINAL_SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
process.env.CURSOR_API_KEY = "test-key";
process.env.SLACK_BOT_TOKEN = "xoxb-test";

afterAll(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = ORIGINAL_API_KEY;
  if (ORIGINAL_SLACK_TOKEN === undefined) {
    delete process.env.SLACK_BOT_TOKEN;
  } else {
    process.env.SLACK_BOT_TOKEN = ORIGINAL_SLACK_TOKEN;
  }
});

function readState(workspace: string): State {
  return JSON.parse(readFileSync(join(workspace, "state.json"), "utf8"));
}

function readPlan(workspace: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(workspace, "plan.json"), "utf8"));
}

function requireTask(
  task: State["tasks"][number] | undefined,
  name: string
): State["tasks"][number] {
  if (!task) throw new Error(`missing task: ${name}`);
  return task;
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${label}`);
}

describe("AgentManager Slack status mirror", () => {
  test("Creates a task thread message then edits it in place", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-mirror-"));
    resetSlackWebApiMock((method, args) => ({
      ok: true,
      channel: args.channel,
      ts: method === "chat.update" ? args.ts : "222.333",
    }));

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "mirror status",
            rootSlug: "mirror-status",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackChannel: TEST_SLACK_CHANNEL,
            slackKickoffRef: { channel: TEST_SLACK_CHANNEL, ts: "111.222" },
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
      const mgr = await AgentManager.load(workspace);
      const task = requireTask(mgr.getTask("worker-one"), "worker-one");

      mgr.touch(task, {
        agentId: "bc-child",
        status: "running",
        startedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
      });
      await waitFor(
        () => readState(workspace).tasks[0]?.slackTs === "222.333",
        "initial Slack mirror"
      );

      mgr.touch(task, { status: "handed-off" });
      await waitFor(
        () => slackWebApiCalls().some(call => call.method === "chat.update"),
        "Slack edit"
      );

      const calls = slackWebApiCalls();
      expect(calls.map(call => call.method)).toEqual([
        "chat.postMessage",
        "chat.update",
      ]);
      expect(calls[0].args).toMatchObject({
        channel: TEST_SLACK_CHANNEL,
        thread_ts: "111.222",
        username: "worker-one",
        text: "▶︎ running\nstarted 2m ago · <https://cursor.com/agents/bc-child|view>",
      });
      expect(calls[0].args.icon_emoji).toBeUndefined();
      expect(calls[1].args).toMatchObject({
        channel: TEST_SLACK_CHANNEL,
        ts: "222.333",
        text: "✓ completed\n<https://cursor.com/agents/bc-child|view>",
      });
      expect(readState(workspace).tasks[0]?.slackTs).toBe("222.333");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("First-time kickoff posts to TEST_SLACK_CHANNEL with summary, dispatcher username, and agent footer", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-kickoff-"));
    resetSlackWebApiMock((_method, args) => ({
      ok: true,
      channel: args.channel,
      ts: "100.001",
    }));

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "fresh kickoff: long agent-facing description that should not show up in slack verbatim",
            summary: "smoke test of the new orchestrate substrate",
            rootSlug: "fresh-kickoff",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            selfAgentId: "bc-root-planner",
            dispatcher: { firstName: "Alex" },
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
      await AgentManager.load(workspace, { slackChannel: TEST_SLACK_CHANNEL });

      const kickoff = slackWebApiCalls().find(
        call => call.method === "chat.postMessage"
      );
      expect(kickoff?.args.channel).toBe(TEST_SLACK_CHANNEL);
      expect(typeof kickoff?.args.client_msg_id).toBe("string");
      expect(kickoff?.args.username).toBe("Alex's bot");
      expect(kickoff?.args.icon_url).toBeUndefined();
      expect(kickoff?.args.icon_emoji).toBeUndefined();
      expect(kickoff?.args.text).toBe(
        "`fresh-kickoff`: smoke test of the new orchestrate substrate <https://cursor.com/agents/bc-root-planner|view>"
      );
      expect(readPlan(workspace).slackKickoffRef).toEqual({
        channel: TEST_SLACK_CHANNEL,
        ts: "100.001",
      });
      expect(readPlan(workspace).slackChannel).toBe(TEST_SLACK_CHANNEL);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Child planner load does not create a top-level kickoff", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-child-no-kickoff-"));
    resetSlackWebApiMock(() => {
      throw new Error("child planner should not post kickoff");
    });

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "child planner",
            rootSlug: "child-planner",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackKickoffRef: { channel: "C123", ts: "111.222" },
            andonStateRef: "main",
            andonStatePath: ".orchestrate/root/state.json",
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

      await AgentManager.load(workspace);

      expect(slackWebApiCalls()).toHaveLength(0);
      expect(readPlan(workspace).slackKickoffRef).toEqual({
        channel: "C123",
        ts: "111.222",
      });
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Child planner load fails when kickoff ref is missing", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-child-missing-ref-"));
    resetSlackWebApiMock(() => {
      throw new Error("child planner should not post kickoff");
    });

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "child planner",
            rootSlug: "child-planner",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            andonStateRef: "main",
            andonStatePath: ".orchestrate/root/state.json",
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

      await expect(AgentManager.load(workspace)).rejects.toThrow(
        /child planner plan missing slackKickoffRef/
      );
      expect(slackWebApiCalls()).toHaveLength(0);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Re-mirrors when agentId lands after the initial running transition", async () => {
    const workspace = mkdtempSync(
      join(tmpdir(), "orch-slack-mirror-late-agentid-")
    );
    let messageTs = 0;
    resetSlackWebApiMock((method, args) => ({
      ok: true,
      channel: args.channel,
      ts: method === "chat.update" ? args.ts : `666.${++messageTs}`,
    }));

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "late agentid",
            rootSlug: "late-agentid",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackKickoffRef: { channel: "C123", ts: "111.222" },
            tasks: [
              { name: "worker-one", type: "worker", scopedGoal: "Do work." },
            ],
          },
          null,
          2
        )
      );
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("worker-one");
      if (!task) throw new Error("worker-one missing");

      // Mimic spawnTask: status:"running" with agentId:null first, then a
      // separate touch sets agentId:"bc-child" without changing status.
      mgr.touch(task, { agentId: null, status: "running" });
      await waitFor(
        () =>
          slackWebApiCalls().some(call => call.method === "chat.postMessage"),
        "initial running mirror"
      );
      mgr.touch(task, { agentId: "bc-child" });
      await waitFor(() => {
        const update = slackWebApiCalls().find(
          call => call.method === "chat.update"
        );
        return Boolean(
          update && String(update.args.text ?? "").includes("bc-child")
        );
      }, "agentId-landed re-mirror");

      const update = slackWebApiCalls().find(
        call => call.method === "chat.update"
      );
      expect(update?.args.text).toBe(
        "▶︎ running\nstarted 0m ago · <https://cursor.com/agents/bc-child|view>"
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Status mirror text includes the child agent's cursor.com footer", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-mirror-footer-"));
    resetSlackWebApiMock((method, args) => ({
      ok: true,
      channel: args.channel,
      ts: method === "chat.update" ? args.ts : "555.666",
    }));

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "footer test",
            rootSlug: "footer-test",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackKickoffRef: { channel: "C123", ts: "111.222" },
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
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("worker-one");
      if (!task) throw new Error("worker-one missing");
      // Pretend the spawn succeeded enough to have an agentId.
      mgr.touch(task, { agentId: "bc-child", status: "running" });
      await waitFor(
        () =>
          slackWebApiCalls().some(call => call.method === "chat.postMessage"),
        "initial mirror"
      );

      const mirror = slackWebApiCalls().find(
        call => call.method === "chat.postMessage"
      );
      expect(mirror?.args.text).toBe(
        "▶︎ running\nstarted 0m ago · <https://cursor.com/agents/bc-child|view>"
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("No token: load works, slackAdapter undefined, attention log + console.error once", async () => {
    const original = process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    const errors: string[] = [];
    const originalConsoleError = console.error;
    console.error = ((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    }) as typeof console.error;
    resetSlackWebApiMock(() => {
      throw new Error("unexpected Slack call when token unset");
    });

    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-no-token-"));
    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "slack disabled",
            rootSlug: "slack-disabled",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
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
      const mgr = await AgentManager.load(workspace);
      expect(mgr.slackAdapter).toBeUndefined();
      expect(slackWebApiCalls()).toHaveLength(0);
      expect(
        errors.filter(line => line.includes("SLACK_BOT_TOKEN not set"))
      ).toHaveLength(1);
      expect(readState(workspace).attention).toEqual([]);

      const task = requireTask(mgr.getTask("worker-one"), "worker-one");
      mgr.touch(task, { status: "running" });
      mgr.touch(task, { status: "handed-off" });
      await new Promise(resolve => setTimeout(resolve, 25));
      expect(slackWebApiCalls()).toHaveLength(0);
      await mgr.andon.drainEvents();
      expect(mgr.andon.isActive()).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
      console.error = originalConsoleError;
      if (original === undefined) {
        delete process.env.SLACK_BOT_TOKEN;
      } else {
        process.env.SLACK_BOT_TOKEN = original;
      }
    }
  });

  test("Serializes rapid status mirrors for one Slack task message", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-mirror-race-"));
    resetSlackWebApiMock(async (method, args) => {
      if (method === "chat.postMessage") {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      return {
        ok: true,
        channel: args.channel,
        ts: method === "chat.update" ? args.ts : "222.333",
      };
    });

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "mirror status",
            rootSlug: "mirror-status",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackKickoffRef: { channel: "C123", ts: "111.222" },
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
      const mgr = await AgentManager.load(workspace);
      const task = requireTask(mgr.getTask("worker-one"), "worker-one");

      mgr.touch(task, { status: "running" });
      mgr.touch(task, { status: "handed-off" });
      await waitFor(
        () => slackWebApiCalls().some(call => call.method === "chat.update"),
        "Slack edit after rapid transitions"
      );

      const calls = slackWebApiCalls();
      expect(calls.map(call => call.method)).toEqual([
        "chat.postMessage",
        "chat.update",
      ]);
      expect(readState(workspace).tasks[0]?.slackTs).toBe("222.333");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Skips Slack update when rendered status tuple is unchanged", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-slack-mirror-noop-"));
    resetSlackWebApiMock((method, args) => ({
      ok: true,
      channel: args.channel,
      ts: method === "chat.update" ? args.ts : "222.333",
    }));

    try {
      writeFileSync(
        join(workspace, "plan.json"),
        JSON.stringify(
          {
            goal: "mirror status",
            rootSlug: "mirror-status",
            baseBranch: "main",
            repoUrl: "https://github.com/example-org/example-repo",
            slackKickoffRef: { channel: "C123", ts: "111.222" },
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
      const mgr = await AgentManager.load(workspace);
      const task = requireTask(mgr.getTask("worker-one"), "worker-one");

      mgr.touch(task, {
        agentId: "bc-child",
        status: "running",
        startedAt: new Date().toISOString(),
      });
      await waitFor(
        () =>
          slackWebApiCalls().some(call => call.method === "chat.postMessage"),
        "initial mirror"
      );
      resetSlackWebApiMock((method, args) => ({
        ok: true,
        channel: args.channel,
        ts: method === "chat.update" ? args.ts : "222.333",
      }));

      await (
        mgr as unknown as {
          mirrorTaskToSlack(task: State["tasks"][number]): Promise<void>;
        }
      ).mirrorTaskToSlack(task);

      expect(slackWebApiCalls()).toEqual([]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

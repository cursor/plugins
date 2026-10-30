import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI_PATH = new URL("../cli.ts", import.meta.url).pathname;
const SCRIPTS_DIR = new URL("..", import.meta.url).pathname;

const workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function writeWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "orch-andon-cli-"));
  workspaces.push(workspace);
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify({
      goal: "andon reason",
      rootSlug: "andon-reason",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      slackChannel: "C123TEST",
      slackKickoffRef: { channel: "C123TEST", ts: "111.222" },
      tasks: [{ name: "worker-one", type: "worker", scopedGoal: "Do it." }],
    })
  );
  return workspace;
}

function raise(reason: string) {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.SLACK_BOT_TOKEN;
  return spawnSync(
    process.execPath,
    [
      CLI_PATH,
      "andon",
      "raise",
      "--reason",
      reason,
      "--workspace",
      writeWorkspace(),
    ],
    { cwd: SCRIPTS_DIR, encoding: "utf8", env }
  );
}

describe("andon raise --reason", () => {
  test.each([
    "",
    "   ",
    "\n\t",
  ])("rejects blank reason %j before touching Slack", reason => {
    const result = raise(reason);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--reason must not be blank");
    expect(result.stderr).not.toContain("SLACK_BOT_TOKEN");
  });

  test("accepts a real reason and proceeds to the Slack target", () => {
    const result = raise("upstream schema is wrong");

    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("--reason must not be blank");
    expect(result.stderr).toContain("SLACK_BOT_TOKEN");
  });
});

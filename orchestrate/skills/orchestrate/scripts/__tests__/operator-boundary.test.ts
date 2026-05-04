import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assertOperatorModeOrBail,
  isOperatorModeEnabled,
  loadAllowedSlackThreadOrBail,
  operatorModeFlagPath,
} from "../cli/util.ts";

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_ORCHESTRATE_OPERATOR = process.env.ORCHESTRATE_OPERATOR;
const tempDirs: string[] = [];

afterEach(() => {
  if (ORIGINAL_HOME === undefined) delete process.env.HOME;
  else process.env.HOME = ORIGINAL_HOME;
  if (ORIGINAL_ORCHESTRATE_OPERATOR === undefined) {
    delete process.env.ORCHESTRATE_OPERATOR;
  } else {
    process.env.ORCHESTRATE_OPERATOR = ORIGINAL_ORCHESTRATE_OPERATOR;
  }
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("operator boundary", () => {
  test("ignores ORCHESTRATE_OPERATOR without the home flag", () => {
    const flagPath = operatorModeFlagPath(useTempHome());
    process.env.ORCHESTRATE_OPERATOR = "1";

    expect(isOperatorModeEnabled(flagPath)).toBe(false);
    expect(() => assertOperatorModeOrBail("test action", flagPath)).toThrow(
      /operator-mode/
    );
  });

  test("requires a current-user 0600 operator flag", () => {
    const home = useTempHome();
    mkdirSync(join(home, ".orchestrate"), { recursive: true });
    const flagPath = operatorModeFlagPath(home);
    writeFileSync(flagPath, "");
    chmodSync(flagPath, 0o644);
    expect(isOperatorModeEnabled(flagPath)).toBe(false);

    chmodSync(flagPath, 0o600);
    expect(isOperatorModeEnabled(flagPath)).toBe(true);
    expect(() =>
      assertOperatorModeOrBail("test action", flagPath)
    ).not.toThrow();
  });

  test("does not trust HOME overrides or symlinked flags", () => {
    const home = useTempHome();
    mkdirSync(join(home, ".orchestrate"), { recursive: true });
    const realFlag = join(home, "real-operator-mode");
    writeFileSync(realFlag, "");
    chmodSync(realFlag, 0o600);
    const symlinkFlag = operatorModeFlagPath(home);
    symlinkSync(realFlag, symlinkFlag);

    process.env.HOME = home;

    expect(operatorModeFlagPath()).not.toBe(symlinkFlag);
    expect(isOperatorModeEnabled(symlinkFlag)).toBe(false);
  });

  test("loads the workspace Slack thread outside operator mode", () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-operator-workspace-"));
    tempDirs.push(workspace);
    writeFileSync(
      join(workspace, "plan.json"),
      JSON.stringify({
        goal: "thread guard",
        rootSlug: "thread-guard",
        baseBranch: "main",
        repoUrl: "https://github.com/example-org/example-repo",
        slackKickoffRef: { channel: "C123", ts: "111.222" },
        tasks: [
          {
            name: "worker-task",
            type: "worker",
            scopedGoal: "Make the change.",
          },
        ],
      })
    );

    expect(loadAllowedSlackThreadOrBail(workspace)).toEqual({
      channel: "C123",
      threadTs: "111.222",
    });
  });
});

function useTempHome(): string {
  const home = mkdtempSync(join(tmpdir(), "orch-operator-home-"));
  tempDirs.push(home);
  delete process.env.ORCHESTRATE_OPERATOR;
  return home;
}

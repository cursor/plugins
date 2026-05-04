import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  classifyFailureMode,
  hasStructuredHandoff,
  writeFailureHandoff,
  writeFinishedNoHandoff,
} from "../core/failure-handoff.ts";
import type { TaskState } from "../schemas.ts";

function fakeTask(overrides: Partial<TaskState> = {}): TaskState {
  return {
    name: "dead-worker",
    type: "worker",
    branch: "agent/dead-worker-abc1",
    startingRef: "main",
    dependsOn: [],
    agentId: "bc-fake-123",
    runId: "run-fake-123",
    parentAgentId: null,
    status: "running",
    resultStatus: null,
    handoffPath: null,
    startedAt: "2026-04-30T00:00:00.000Z",
    finishedAt: null,
    lastUpdate: "2026-04-30T01:10:00.000Z",
    note: "last heartbeat before crash",
    slackTs: null,
    prNumber: null,
    failureMode: null,
    verification: null,
    ...overrides,
  };
}

describe("classifyFailureMode", () => {
  // OOM in the stream tail wins over a network-looking SDK string: the
  // OOMKilled signal is a harder diagnostic than the generic drop.
  test("OOM markers in lastOutput beat SDK error text", () => {
    expect(
      classifyFailureMode({
        sdkError: "fetch failed: ECONNRESET",
        lastOutput: "process was OOMKilled (exit code 137)",
        durationMs: 5_000,
      })
    ).toBe("oom");
  });

  test("OOM markers in SDK error classify as oom", () => {
    expect(
      classifyFailureMode({
        sdkError: "container terminated: out of memory",
        lastOutput: null,
        durationMs: null,
      })
    ).toBe("oom");
  });

  test("Duration in the 70-80 min window classifies as cap-hit", () => {
    expect(
      classifyFailureMode({
        sdkError: "run terminated",
        lastOutput: null,
        durationMs: 72 * 60 * 1000,
      })
    ).toBe("cap-hit");
  });

  test("Duration outside cap-hit window falls through", () => {
    expect(
      classifyFailureMode({
        sdkError: "run terminated",
        lastOutput: null,
        durationMs: 65 * 60 * 1000,
      })
    ).toBe("unknown");
  });

  test("Tool-use error classifies as tool-error", () => {
    expect(
      classifyFailureMode({
        sdkError: "tool_use_failed: invalid arguments to ReadFile",
        lastOutput: null,
        durationMs: 30_000,
      })
    ).toBe("tool-error");
  });

  test("Network-ish SDK error classifies as network-drop", () => {
    expect(
      classifyFailureMode({
        sdkError: "fetch failed: ETIMEDOUT connecting to api",
        lastOutput: null,
        durationMs: 30_000,
      })
    ).toBe("network-drop");
  });

  test("Empty signals default to unknown", () => {
    expect(
      classifyFailureMode({
        sdkError: null,
        lastOutput: null,
        durationMs: null,
      })
    ).toBe("unknown");
  });
});

describe("writeFailureHandoff", () => {
  test("Writes <task>-failure.md with the expected structure", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-failure-"));
    try {
      const path = writeFailureHandoff({
        handoffsDir: dir,
        task: fakeTask(),
        failureMode: "cap-hit",
        sdkError: "run terminated before completion",
        lastToolCall: "EditFile",
        terminatedAt: "2026-04-30T01:15:00.000Z",
      });
      expect(path).toBe(join(dir, "dead-worker-failure.md"));
      const body = readFileSync(path, "utf8");
      expect(body).toContain("failureMode: cap-hit");
      expect(body).toContain("# dead-worker failure handoff");
      expect(body).toContain("Failure mode: cap-hit");
      expect(body).toContain("Cloud agent: bc-fake-123");
      expect(body).toContain("Branch: agent/dead-worker-abc1");
      expect(body).toContain("Last tool call: EditFile");
      expect(body).toContain(
        "Last activity: 2026-04-30T01:10:00.000Z - last heartbeat before crash"
      );
      expect(body).toContain("## Suggested next steps");
      expect(body).toContain("Retry with smaller scope");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("Suggestions bend to the failure mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-failure-"));
    try {
      const path = writeFailureHandoff({
        handoffsDir: dir,
        task: fakeTask({ name: "flaky-worker" }),
        failureMode: "network-drop",
        sdkError: "fetch failed: ETIMEDOUT",
        terminatedAt: "2026-04-30T00:05:00.000Z",
      });
      const body = readFileSync(path, "utf8");
      expect(body).toMatch(/- Retry as-is \(treat as transient\)/);
      expect(body).not.toMatch(/Retry with smaller scope/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("writeFinishedNoHandoff", () => {
  test("Writes <task>-finished-no-handoff.md with raw snippet", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-finished-nh-"));
    try {
      const path = writeFinishedNoHandoff({
        handoffsDir: dir,
        task: fakeTask({ name: "silent-worker" }),
        resultStatus: "finished",
        terminatedAt: "2026-04-30T01:15:00.000Z",
        rawBodySnippet: "just some prose, no headings",
      });
      expect(path).toBe(join(dir, "silent-worker-finished-no-handoff.md"));
      const body = readFileSync(path, "utf8");
      expect(body).toContain("# silent-worker finished without handoff");
      expect(body).toContain("Status: finished (cloud agent ended cleanly");
      expect(body).toContain("## Suggested next steps");
      expect(body).toContain("just some prose, no headings");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("hasStructuredHandoff", () => {
  test("Detects the worker template's ## Status heading", () => {
    const body = ["## Status", "success", "## Branch", "`x/y`"].join("\n");
    expect(hasStructuredHandoff(body)).toBe(true);
  });

  // Verifier handoffs use `## Verification` instead of `## Status`. A
  // verifier-only match keeps the finished-no-handoff sidecar from
  // firing on every successful verifier run.
  test("Detects the verifier template's ## Verification heading", () => {
    const body = ["## Verification", "live-ui-verified", "## Target", "`t`"].join("\n");
    expect(hasStructuredHandoff(body)).toBe(true);
  });

  test("Prose without a structured heading returns false", () => {
    expect(hasStructuredHandoff("I did some stuff and left.")).toBe(false);
  });

  test("Null or empty returns false", () => {
    expect(hasStructuredHandoff(null)).toBe(false);
    expect(hasStructuredHandoff("")).toBe(false);
  });
});

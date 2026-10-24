import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  writeFailureHandoff,
  writeFinishedNoHandoff,
} from "../core/failure-handoff.ts";
import { renderPromptTemplate } from "../core/prompts.ts";
import type { TaskState } from "../schemas.ts";

function fakeTask(overrides: Partial<TaskState> = {}): TaskState {
  return {
    name: "template-worker",
    type: "worker",
    branch: "agent/template-worker-abc1",
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
    note: null,
    slackTs: null,
    prNumber: null,
    failureMode: null,
    verification: null,
    ...overrides,
  };
}

const finishedVars = {
  taskName: "t",
  branch: "b",
  agentId: "a",
  runId: "r",
  resultStatus: "finished",
  terminatedAt: "2026-04-30T01:00:00.000Z",
  rawSnippetBlock: "",
};

describe("renderPromptTemplate values", () => {
  test("a value that contains {{...}} is kept verbatim and is not a placeholder", () => {
    const rendered = renderPromptTemplate("finished-no-handoff", {
      ...finishedVars,
      rawSnippetBlock:
        "\n\n## Raw final output\n\nAdded `<p>{{ user.name }}</p>` to the Vue template.\n",
    });
    expect(rendered).toContain("<p>{{ user.name }}</p>");
  });

  test("a value that names another placeholder is not substituted by it", () => {
    const rendered = renderPromptTemplate("finished-no-handoff", {
      ...finishedVars,
      taskName: "see {{runId}} here",
      runId: "RUN-123",
    });
    expect(rendered).toContain("see {{runId}} here");
    expect(rendered).toContain("RUN-123");
  });

  test("replacement patterns in a value are literal", () => {
    const dollarQuote = "$" + "'";
    const value = `cost was ${dollarQuote} and $& and $$5 and $1`;
    const rendered = renderPromptTemplate("finished-no-handoff", {
      ...finishedVars,
      taskName: value,
    });
    expect(rendered).toContain(value);
    // `$&` used to re-insert the placeholder itself, which then read as unrendered.
    expect(rendered).not.toContain("{{taskName}}");
  });

  test("a placeholder missing from vars is still reported", () => {
    expect(() =>
      renderPromptTemplate("finished-no-handoff", {
        ...finishedVars,
        rawSnippetBlock: undefined as unknown as string,
      })
    ).toThrow(/unrendered placeholders: rawSnippetBlock/);
  });
});

describe("failure sidecars with template-looking content", () => {
  test("finished-no-handoff keeps an agent's {{ }} output", () => {
    const dir = mkdtempSync(join(tmpdir(), "orchestrate-handoffs-"));
    try {
      const path = writeFinishedNoHandoff({
        handoffsDir: dir,
        task: fakeTask(),
        resultStatus: "finished",
        terminatedAt: "2026-04-30T01:00:00.000Z",
        rawBodySnippet: "Rendered <p>{{ user.name }}</p> and stopped.",
      });
      expect(readFileSync(path, "utf8")).toContain("{{ user.name }}");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("failure handoff keeps an SDK error with $& in it", () => {
    const dir = mkdtempSync(join(tmpdir(), "orchestrate-handoffs-"));
    try {
      const path = writeFailureHandoff({
        handoffsDir: dir,
        task: fakeTask(),
        failureMode: "unknown",
        sdkError: "sed: expression `s/x/$&y/' failed",
        terminatedAt: "2026-04-30T01:00:00.000Z",
      });
      expect(readFileSync(path, "utf8")).toContain("s/x/$&y/");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

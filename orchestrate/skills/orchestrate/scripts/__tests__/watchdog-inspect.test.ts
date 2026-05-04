import { describe, expect, test } from "bun:test";

import {
  formatToolCallIdleWarning,
  inspectRunStream,
} from "../core/agent-manager.ts";

describe("watchdog tool-call idle warning", () => {
  test("Formats last-tool-call timestamp", () => {
    const warning = formatToolCallIdleWarning({
      taskLabel: "subplan-x",
      idleMs: 600_000,
      lastToolCallAt: Date.parse("2026-04-30T01:00:00.000Z"),
      waitStartedAt: Date.parse("2026-04-30T00:55:00.000Z"),
    });
    expect(warning).toBe(
      "subplan-x: tool_call idle 600000ms; last=2026-04-30T01:00:00.000Z"
    );
  });
});

describe("inspectRunStream", () => {
  test("Aggregates assistant text and tool-call liveness", async () => {
    async function* stream() {
      yield {
        type: "status",
        status: "running",
      };
      yield {
        type: "assistant",
        message: { content: [{ type: "text", text: "hel" }] },
      };
      yield {
        type: "assistant",
        message: { content: [{ type: "text", text: "lo" }] },
      };
      yield {
        type: "tool_call",
        name: "Shell",
        status: "started",
        call_id: "call-1",
        args: { command: "echo ok", apiKey: "secret-value" },
      };
    }

    const inspection = await inspectRunStream({
      run: { stream } as never,
      task: "worker-a",
      agentId: "agent-1",
      runId: "run-1",
      timeoutMs: 100,
    });

    expect(inspection.streamed_messages).toEqual(["hello"]);
    expect(inspection.tool_calls_total).toBe(1);
    expect(inspection.tool_calls_last_5min).toBe(1);
    expect(inspection.last_assistant_text_snippet).toBe("hello");
    expect(inspection.last_tool_call).toMatchObject({
      type: "tool_call",
      name: "Shell",
      call_id: "call-1",
    });
    expect(inspection.last_tool_call?.payload_snippet).not.toContain(
      "secret-value"
    );
  });

  test("Reports truncated=true when full payload sits one char past the cap", async () => {
    // Build a payload whose redacted JSON is exactly 1_001 chars long. The
    // older `snippet.length<full.length` check returned false there because
    // truncate appends an ellipsis that pads the snippet back up to 1_001.
    const skeleton = JSON.stringify({
      type: "tool_call",
      name: "S",
      status: "s",
      call_id: "c",
      details: "",
    });
    const padding = "a".repeat(1_001 - skeleton.length);
    async function* stream() {
      yield {
        type: "tool_call",
        name: "S",
        status: "s",
        call_id: "c",
        details: padding,
      };
    }
    const inspection = await inspectRunStream({
      run: { stream } as never,
      task: "worker-pad",
      agentId: "agent-pad",
      runId: "run-pad",
      timeoutMs: 100,
    });
    expect(inspection.last_tool_call?.truncated).toBe(true);
  });
});

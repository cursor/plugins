import { describe, expect, test } from "bun:test";
import { renderPromptTemplate } from "../core/prompts.ts";

describe("literal template values", () => {
  const values = {
    goal: "Build a feature",
    agentId: "agent-123",
    dispatcherInstruction: "",
    slackChannelInstruction: "",
    loopHygiene: "",
  };

  test("preserves JavaScript replacement tokens in a task goal", () => {
    const goal = "Implement replacements $& and $` and $' literally";
    expect(renderPromptTemplate("root", { ...values, goal })).toContain(goal);
  });

  test("preserves code template braces in a task goal", () => {
    const goal = "Render the user template {{customer}} literally";
    expect(renderPromptTemplate("root", { ...values, goal })).toContain(goal);
  });

  test("does not replace inserted text with other template variable values", () => {
    const goal = "Test literal {{agentId}} syntax";
    expect(renderPromptTemplate("root", { ...values, goal })).toContain(goal);
  });

  test("ordinary template variables still render", () => {
    const rendered = renderPromptTemplate("root", values);
    expect(rendered).toContain(values.goal);
    expect(rendered).toContain(values.agentId);
  });

  test("missing template variables still fail with an actionable error", () => {
    expect(() => renderPromptTemplate("root", { goal: "test" })).toThrow("unrendered placeholders");
  });
});

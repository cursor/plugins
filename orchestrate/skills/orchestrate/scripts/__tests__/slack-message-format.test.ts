import { describe, expect, test } from "bun:test";

import {
  formatAgentFooter,
  formatKickoffText,
  kickoffUsername,
} from "../core/agent-manager.ts";
import type { Plan } from "../schemas.ts";

function plan(partial: Partial<Plan>): Plan {
  return {
    goal: "default goal",
    rootSlug: "default-slug",
    baseBranch: "main",
    repoUrl: "https://github.com/example-org/example-repo",
    syncStateToGit: true,
    ...partial,
  } as Plan;
}

describe("formatAgentFooter", () => {
  test("Renders Slack mrkdwn link when agentId is present", () => {
    expect(formatAgentFooter("bc-abc123")).toBe(
      "<https://cursor.com/agents/bc-abc123|view>"
    );
  });

  test("Returns empty for missing agentId so callers can append unconditionally", () => {
    expect(formatAgentFooter(null)).toBe("");
    expect(formatAgentFooter(undefined)).toBe("");
    expect(formatAgentFooter("")).toBe("");
    expect(formatAgentFooter("   ")).toBe("");
  });
});

describe("formatKickoffText", () => {
  test("Uses summary when set; one-line shape with footer", () => {
    const text = formatKickoffText(
      plan({
        goal: "verbose ten-paragraph user goal that should not appear",
        summary: "smoke test of the new orchestrate substrate",
        rootSlug: "canvas-toy",
        selfAgentId: "bc-root",
      })
    );

    expect(text).toBe(
      "`canvas-toy`: smoke test of the new orchestrate substrate <https://cursor.com/agents/bc-root|view>"
    );
  });

  test("Falls back to truncated goal first line when summary unset", () => {
    const longGoal = `${"a".repeat(250)}\n\nrest of the goal`;
    const text = formatKickoffText(
      plan({ goal: longGoal, rootSlug: "long-goal" })
    );

    expect(text.startsWith("`long-goal`: ")).toBe(true);
    expect(text.endsWith("…")).toBe(true);
    // No agent footer when selfAgentId is missing.
    expect(text.includes("cursor.com/agents")).toBe(false);
  });

  test("Footer is omitted without selfAgentId", () => {
    const text = formatKickoffText(
      plan({ summary: "do the thing", rootSlug: "no-agent" })
    );
    expect(text).toBe("`no-agent`: do the thing");
  });
});

describe("kickoffUsername", () => {
  test("Uses dispatcher.firstName when set", () => {
    expect(kickoffUsername(plan({ dispatcher: { firstName: "Alex" } }))).toBe(
      "Alex's bot"
    );
  });

  test("Falls back to 'orchestrate' without dispatcher", () => {
    expect(kickoffUsername(plan({}))).toBe("orchestrate");
  });

  test("Trims whitespace-only first name back to 'orchestrate'", () => {
    expect(
      kickoffUsername(plan({ dispatcher: { firstName: "   " } as never }))
    ).toBe("orchestrate");
  });
});

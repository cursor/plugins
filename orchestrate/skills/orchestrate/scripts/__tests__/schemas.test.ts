import { describe, expect, test } from "bun:test";

import {
  formatZodIssues,
  PlanSchema,
  parsePlanJson,
  parseStateJson,
  parseTreeStateJson,
  StateSchema,
  StopResultSchema,
} from "../schemas.ts";

describe("schemas", () => {
  test("PlanSchema accepts verifier that targets known task", () => {
    const plan = PlanSchema.safeParse({
      goal: "ship a refactor",
      rootSlug: "ship-refactor",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [
        {
          name: "worker-task",
          type: "worker",
          scopedGoal: "Make the change.",
        },
        {
          name: "verify-worker-task",
          type: "verifier",
          scopedGoal: "Check the change.",
          verifies: "worker-task",
        },
      ],
    });
    expect(plan.success).toBe(true);
    if (plan.success) {
      expect(plan.data.tasks?.[1]?.type).toBe("verifier");
      expect(plan.data.tasks?.[1]?.verifies).toBe("worker-task");
    }
  });

  test("PlanSchema rejects verifier that targets missing task", () => {
    const plan = PlanSchema.safeParse({
      goal: "bad verifier",
      rootSlug: "bad-verifier",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [
        {
          name: "verify-missing",
          type: "verifier",
          scopedGoal: "Check the missing task.",
          verifies: "missing-task",
        },
      ],
    });
    expect(plan.success).toBe(false);
    if (!plan.success) {
      expect(formatZodIssues(plan.error.issues)).toMatch(
        /verifies unknown task/
      );
    }
  });

  test("PlanSchema rejects removed tracker fields", () => {
    const plan = PlanSchema.safeParse({
      goal: "linear tracking",
      rootSlug: "linear-tracking",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tracker: "linear",
      tasks: [
        {
          name: "worker-task",
          type: "worker",
          scopedGoal: "Make the change.",
        },
      ],
    });
    expect(plan.success).toBe(false);
    if (!plan.success) {
      expect(formatZodIssues(plan.error.issues)).toMatch(/tracker/);
    }
  });

  test("PlanSchema accepts a script-written slackKickoffRef", () => {
    const plan = PlanSchema.safeParse({
      goal: "slack visibility",
      rootSlug: "slack-visibility",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      slackKickoffRef: { channel: "C123TEST", ts: "111.222" },
      tasks: [
        {
          name: "worker-task",
          type: "worker",
          scopedGoal: "Make the change.",
        },
      ],
    });
    expect(plan.success).toBe(true);
    if (plan.success) {
      expect(plan.data.slackKickoffRef).toEqual({
        channel: "C123TEST",
        ts: "111.222",
      });
    }
  });

  test("parsePlanJson preserves script-written task slackTs", () => {
    const plan = parsePlanJson(
      JSON.stringify({
        goal: "slack mirror",
        rootSlug: "slack-mirror",
        baseBranch: "main",
        repoUrl: "https://github.com/example-org/example-repo",
        tasks: [
          {
            name: "worker-task",
            type: "worker",
            scopedGoal: "Make the change.",
            slackTs: "1714500000.000100",
          },
        ],
      }),
      "plan.json"
    );

    expect(plan.tasks?.[0]?.slackTs).toBe("1714500000.000100");
  });

  test("PlanSchema rejects legacy plan.slack with a migration error", () => {
    expect(() =>
      parsePlanJson(
        JSON.stringify({
          goal: "old slack config",
          rootSlug: "old-slack-config",
          baseBranch: "main",
          repoUrl: "https://github.com/example-org/example-repo",
          slack: { channel: "#orch-runs" },
          tasks: [
            {
              name: "worker-task",
              type: "worker",
              scopedGoal: "Make the change.",
            },
          ],
        }),
        "plan.json"
      )
    ).toThrow(/plan\.slackKickoffRef/);
  });

  test("parsePlanJson gives a clear migration error for tracker-backed plans", () => {
    expect(() =>
      parsePlanJson(
        JSON.stringify({
          goal: "old tracker plan",
          rootSlug: "old-tracker-plan",
          baseBranch: "main",
          repoUrl: "https://github.com/example-org/example-repo",
          tracker: "linear",
          linearTeam: "ENG",
          trackerRef: "ROOT-1",
          tasks: [
            {
              name: "worker-task",
              type: "worker",
              scopedGoal: "Make the change.",
              trackerRef: "PROJ-1",
            },
          ],
        }),
        "plan.json"
      )
    ).toThrow(/uses removed plan field\(s\)/);
  });

  test("StateSchema applies nullable defaults", () => {
    const state = StateSchema.safeParse({
      rootSlug: "ship-refactor",
      tasks: [
        {
          name: "worker-task",
          type: "worker",
          branch: "orch/ship-refactor/worker-task",
          startingRef: "main",
          dependsOn: [],
          status: "pending",
        },
      ],
      attention: [],
    });
    expect(state.success).toBe(true);
    if (state.success) {
      expect(state.data.tasks[0]?.agentId).toBe(null);
      expect(state.data.tasks[0]?.runId).toBe(null);
      expect(state.data.tasks[0]?.slackTs).toBe(null);
      expect(state.data.tasks[0]?.verification).toBe(null);
    }
  });

  test("StateSchema accepts every new verification enum value", () => {
    for (const value of [
      "live-ui-verified",
      "unit-test-verified",
      "type-check-only",
      "verifier-blocked",
      "verifier-failed",
      "not-verified",
    ] as const) {
      const state = StateSchema.safeParse({
        rootSlug: "ship-refactor",
        tasks: [
          {
            name: "worker-task",
            type: "worker",
            branch: "orch/ship-refactor/worker-task",
            startingRef: "main",
            dependsOn: [],
            status: "handed-off",
            verification: value,
          },
        ],
        attention: [],
      });
      expect(state.success).toBe(true);
      if (state.success) {
        expect(state.data.tasks[0]?.verification).toBe(value);
      }
    }
  });

  test("StateSchema rejects an unknown verification value", () => {
    const state = StateSchema.safeParse({
      rootSlug: "ship-refactor",
      tasks: [
        {
          name: "worker-task",
          type: "worker",
          branch: "orch/ship-refactor/worker-task",
          startingRef: "main",
          dependsOn: [],
          status: "handed-off",
          verification: "pass",
        },
      ],
      attention: [],
    });
    expect(state.success).toBe(false);
    if (!state.success) {
      expect(formatZodIssues(state.error.issues)).toMatch(/verification/);
    }
  });

  test("parseStateJson drops legacy task trackerRef fields", () => {
    const state = parseStateJson(
      JSON.stringify({
        rootSlug: "ship-refactor",
        tasks: [
          {
            name: "worker-task",
            type: "worker",
            branch: "orch/ship-refactor/worker-task",
            startingRef: "main",
            dependsOn: [],
            status: "pending",
            trackerRef: "PROJ-1",
          },
        ],
        attention: [],
      }),
      "state.json"
    );

    expect(state.tasks[0]?.slackTs).toBe(null);
  });

  test("StopResultSchema requires previousStatus for noop", () => {
    const noop = StopResultSchema.safeParse({
      name: "already-done",
      action: "noop",
    });
    expect(noop.success).toBe(false);
    if (!noop.success) {
      expect(formatZodIssues(noop.error.issues)).toMatch(
        /previousStatus: Required/
      );
    }
  });

  test("parseTreeStateJson drops invalid root and bad tasks", () => {
    const state = parseTreeStateJson(
      JSON.stringify({
        rootSlug: "not/root",
        tasks: [
          {
            name: "child-planner",
            type: "subplanner",
            status: "running",
            agentId: "agent-1",
            runId: "run-1",
            parentAgentId: null,
            branch: 42,
          },
          {
            name: "bad-agent-id",
            type: "worker",
            status: "running",
            agentId: 123,
            runId: "run-2",
            parentAgentId: null,
          },
        ],
        attention: [{ at: "not-a-date", message: 123 }],
      }),
      "state.json"
    );
    expect(state.rootSlug).toBe(null);
    expect(state.tasks.map(task => task.name)).toEqual(["child-planner"]);
  });
});

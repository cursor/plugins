import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildKickoffPrompt } from "../cli/util.ts";
import {
  buildSubplannerPrompt,
  buildVerifierPrompt,
  buildWorkerPrompt,
} from "../core/prompts.ts";
import type { Plan } from "../schemas.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(SCRIPT_DIR, "../../prompts");

const SLOP_PHRASES = [
  // Bot-speak
  "I have completed",
  "Successfully executed",
  "Please find attached",
  "Let me know if you need anything else",
  "I hope this helps",
  // Em dash AI tell
  "—",
  // Decorative
  "✨",
  "🎉",
  "📊",
];

const ALLOWED_FILES_FOR_PHRASE: Record<string, Set<string>> = {
  // slack-block.md documents these phrases explicitly as examples of
  // bot-speak to avoid; the meta-rule that names them is allowed to use them.
  "I have completed": new Set(["slack-block.md"]),
  "Successfully executed": new Set(["slack-block.md"]),
  "Please find attached": new Set(["slack-block.md"]),
};

describe("Slack prompt shape", () => {
  test("Prompt files contain no slop phrases or em dashes", () => {
    const files = readdirSync(PROMPTS_DIR).filter(name => name.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const body = readFileSync(join(PROMPTS_DIR, file), "utf8");
      for (const phrase of SLOP_PHRASES) {
        if (!body.includes(phrase)) continue;
        if (ALLOWED_FILES_FOR_PHRASE[phrase]?.has(file)) continue;
        offenders.push(`${file}: contains "${phrase}"`);
      }
    }

    expect(offenders).toEqual([]);
  });

  test("Agent prompts do not expose Slack transport details", () => {
    const files = ["worker.md", "subplanner.md", "verifier.md"];
    const offenders: string[] = [];
    const forbidden = [
      /Slack/i,
      /thread_ts/,
      /run thread/i,
      /channel/i,
      /comment \.\.\. --file/,
      /posting status/i,
    ];

    for (const file of files) {
      const body = readFileSync(join(PROMPTS_DIR, file), "utf8");
      for (const pattern of forbidden) {
        if (pattern.test(body)) offenders.push(`${file}: ${pattern.source}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("buildKickoffPrompt", () => {
  test("Adds dispatcher instruction when firstName is provided", () => {
    const prompt = buildKickoffPrompt({
      goal: "ship it",
      agentId: "bc-root",
      dispatcherFirstName: "Alex",
    });

    expect(prompt).toContain("Operator: Alex.");
    expect(prompt).toContain('plan.dispatcher = { firstName: "Alex" }');
    expect(prompt).toContain('"Alex\'s bot"');
  });

  test("Omits dispatcher instruction when firstName is unset", () => {
    const prompt = buildKickoffPrompt({
      goal: "ship it",
      agentId: "bc-root",
    });

    expect(prompt).not.toContain("Operator:");
    expect(prompt).not.toContain("dispatcher = {");
  });

  test("Adds Slack channel instruction when provided", () => {
    const prompt = buildKickoffPrompt({
      goal: "ship it",
      agentId: "bc-root",
      slackChannel: "C123TEST",
    });

    expect(prompt).toContain('plan.slackChannel = "C123TEST"');
  });

  test("Omits dispatcher instruction for whitespace-only firstName", () => {
    const prompt = buildKickoffPrompt({
      goal: "ship it",
      agentId: "bc-root",
      dispatcherFirstName: "   ",
    });

    expect(prompt).not.toContain("Operator:");
  });

  test("Escapes quotes, backticks, and backslashes in firstName", () => {
    const prompt = buildKickoffPrompt({
      goal: "ship it",
      agentId: "bc-root",
      dispatcherFirstName: 'Alex"; throw new Error("xss',
    });

    // JSON-stringified literal protects the embedded plan.json snippet.
    expect(prompt).toContain('firstName: "Alex\\"; throw new Error(\\"xss"');
    // The username string is also escaped via JSON.stringify.
    expect(prompt).toContain('"Alex\\"; throw new Error(\\"xss\'s bot"');
    // Prose strips control chars/backticks but doesn't need JSON escaping.
    expect(prompt).toContain('Operator: Alex"; throw new Error("xss.');
  });
});

describe("agent prompt transport boundary", () => {
  test("Spawned worker prompt omits Slack CLI details", () => {
    const prompt = buildWorkerPrompt(
      {
        name: "frontend-toggle",
        type: "worker",
        scopedGoal: "Add the toggle.",
      },
      "bc-worker-123",
      promptCtx({
        slackKickoffRef: { channel: "C123", ts: "111.222" },
      })
    );

    expect(prompt).not.toContain("--agent-id");
    expect(prompt).not.toContain("C123");
    expect(prompt).not.toContain("111.222");
  });

  test("Spawned subplanner prompt omits Slack refs", () => {
    const prompt = buildSubplannerPrompt(
      {
        name: "frontend-slice",
        type: "subplanner",
        scopedGoal: "Own frontend work.",
      },
      "bc-subplanner-123",
      promptCtx({
        slackKickoffRef: { channel: "C123", ts: "111.222" },
      })
    );

    expect(prompt).not.toContain("slackKickoffRef");
    expect(prompt).not.toContain("C123");
    expect(prompt).not.toContain("111.222");
  });

  test("Spawned verifier prompt omits Slack CLI details", () => {
    const prompt = buildVerifierPrompt(
      {
        name: "verify-frontend-toggle",
        type: "verifier",
        scopedGoal: "Verify the toggle.",
        verifies: "frontend-toggle",
      },
      "bc-verifier-123",
      promptCtx({
        slackKickoffRef: { channel: "C123", ts: "111.222" },
        tasks: [
          {
            name: "frontend-toggle",
            type: "worker",
            scopedGoal: "Add the toggle.",
          },
        ],
      } as Partial<Plan>)
    );

    expect(prompt).not.toContain("--agent-id");
    expect(prompt).not.toContain("C123");
    expect(prompt).not.toContain("111.222");
  });

  test("Preview render omits Slack CLI details", () => {
    const prompt = buildWorkerPrompt(
      {
        name: "frontend-toggle",
        type: "worker",
        scopedGoal: "Add the toggle.",
      },
      undefined,
      promptCtx({
        slackKickoffRef: { channel: "C123", ts: "111.222" },
      })
    );

    expect(prompt).not.toContain("--agent-id");
    expect(prompt).not.toContain("--sender frontend-toggle --workspace");
    expect(prompt).not.toContain('--reason "<why>" --workspace');
  });
});

function promptCtx(planOverrides: Partial<Plan>) {
  const plan: Plan = {
    goal: "default goal",
    rootSlug: "default-slug",
    baseBranch: "main",
    repoUrl: "https://github.com/example-org/example-repo",
    syncStateToGit: true,
    ...planOverrides,
  } as Plan;
  return {
    plan,
    branchForTask: () => "orch/default-slug/frontend-toggle",
    getTask: () => undefined,
    readHandoff: () => null,
  };
}

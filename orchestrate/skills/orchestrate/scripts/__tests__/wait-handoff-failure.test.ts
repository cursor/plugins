import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Single `mock.module` install that delegates to a module-local
// `currentRun` the tests swap, since `agent-manager.ts` caches the SDK
// reference after the first `loadSDK()`.

const SDK_MOCK = "@cursor/sdk";

interface FakeRunResult {
  id: string;
  status: "finished" | "error";
  result?: string;
  durationMs?: number;
  error?: string;
  git?: { branches: Array<{ branch?: string | null }> };
}

interface FakeRunOpts {
  id: string;
  agentId: string;
  runResult: FakeRunResult;
  streamChunks?: Array<{ type: string; [key: string]: unknown }>;
}

let currentRun: FakeRunOpts | null = null;

function setFakeRun(opts: FakeRunOpts): void {
  currentRun = opts;
}

function makeFakeRun(opts: FakeRunOpts) {
  return {
    id: opts.id,
    agentId: opts.agentId,
    status: opts.runResult.status,
    stream: async function* () {
      for (const chunk of opts.streamChunks ?? []) yield chunk;
    },
    wait: async () => opts.runResult,
  };
}

mock.module(SDK_MOCK, () => ({
  Agent: {
    create: async () => {
      if (!currentRun) throw new Error("SDK mock: setFakeRun() first");
      return {
        agentId: currentRun.agentId,
        send: async () =>
          makeFakeRun(currentRun ?? (null as unknown as FakeRunOpts)),
        [Symbol.asyncDispose]: () => Promise.resolve(),
      };
    },
    getRun: async () => {
      if (!currentRun) throw new Error("SDK mock: setFakeRun() first");
      return makeFakeRun(currentRun);
    },
  },
  CursorAgentError: class CursorAgentError extends Error {},
}));

// Earlier test files may have pinned `Agent` to the real SDK. Reset so
// our mock above reaches the SUT.
const { AgentManager, __resetSDKForTests } = await import(
  "../core/agent-manager.ts"
);
__resetSDKForTests();

const ORIGINAL_API_KEY = process.env.CURSOR_API_KEY;

beforeAll(() => {
  process.env.CURSOR_API_KEY = "test-key";
});

afterAll(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = ORIGINAL_API_KEY;
});

afterEach(() => {
  currentRun = null;
});

function writePlan(workspace: string) {
  writeFileSync(
    join(workspace, "plan.json"),
    JSON.stringify({
      goal: "prove failure handoffs",
      rootSlug: "fail-test",
      baseBranch: "main",
      repoUrl: "https://github.com/example-org/example-repo",
      tasks: [
        {
          name: "crashy-worker",
          type: "worker",
          scopedGoal: "Crash please.",
        },
      ],
    })
  );
}

describe("waitAndHandoff post-mortem paths", () => {
  test("Error run writes <task>-failure.md and marks task error", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-fail-error-"));
    writePlan(workspace);
    setFakeRun({
      id: "run-fail",
      agentId: "bc-fail",
      runResult: {
        id: "run-fail",
        status: "error",
        error: "fetch failed: ECONNRESET",
        durationMs: 20_000,
        result: "",
        git: { branches: [{ branch: "agent/crashy-worker-fail" }] },
      },
    });
    try {
      const mgr = await AgentManager.load(workspace);
      const def = mgr.plan.tasks?.find(t => t.name === "crashy-worker");
      if (!def) throw new Error("missing task def");
      const spawned = await mgr.spawnTask(def);
      if (!spawned) throw new Error("spawn failed");
      await mgr.waitAndHandoff(spawned);

      const task = mgr.getTask("crashy-worker");
      expect(task?.status).toBe("error");

      const failurePath = join(
        workspace,
        "handoffs",
        "crashy-worker-failure.md"
      );
      expect(existsSync(failurePath)).toBe(true);
      const body = readFileSync(failurePath, "utf8");
      expect(body).toContain("# crashy-worker failure handoff");
      expect(body).toContain("Failure mode: network-drop");
      expect(body).toContain("SDK error: fetch failed: ECONNRESET");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  // Sidecar fires when the run finishes without a ## Status section.
  test("Finished-without-handoff writes <task>-finished-no-handoff.md", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-fail-finished-"));
    writePlan(workspace);
    setFakeRun({
      id: "run-silent",
      agentId: "bc-silent",
      runResult: {
        id: "run-silent",
        status: "finished",
        result: "I did some stuff, no headings though.",
        durationMs: 5_000,
        git: { branches: [{ branch: "agent/crashy-worker-silent" }] },
      },
    });
    try {
      const mgr = await AgentManager.load(workspace);
      const def = mgr.plan.tasks?.find(t => t.name === "crashy-worker");
      if (!def) throw new Error("missing task def");
      const spawned = await mgr.spawnTask(def);
      if (!spawned) throw new Error("spawn failed");
      await mgr.waitAndHandoff(spawned);

      const sidecar = join(
        workspace,
        "handoffs",
        "crashy-worker-finished-no-handoff.md"
      );
      expect(existsSync(sidecar)).toBe(true);
      const body = readFileSync(sidecar, "utf8");
      expect(body).toContain("finished without handoff");
      expect(body).toContain("no headings though");

      // Sidecar is additive; the regular <task>.md still carries the raw body.
      const regularPath = join(workspace, "handoffs", "crashy-worker.md");
      expect(existsSync(regularPath)).toBe(true);
      expect(readFileSync(regularPath, "utf8")).toContain(
        "I did some stuff, no headings though."
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("Recover on restart against already-terminated agent writes sidecar", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-fail-recover-"));
    writePlan(workspace);
    writeFileSync(
      join(workspace, "state.json"),
      JSON.stringify({
        rootSlug: "fail-test",
        attention: [],
        tasks: [
          {
            name: "crashy-worker",
            type: "worker",
            branch: "orch/fail-test/crashy-worker",
            startingRef: "main",
            dependsOn: [],
            agentId: "bc-dead",
            runId: "run-dead",
            parentAgentId: null,
            status: "running",
            resultStatus: null,
            handoffPath: null,
            startedAt: "2026-04-30T00:00:00.000Z",
            finishedAt: null,
            lastUpdate: "2026-04-30T00:01:00.000Z",
            note: null,
            slackTs: null,
          },
        ],
      })
    );
    setFakeRun({
      id: "run-dead",
      agentId: "bc-dead",
      runResult: {
        id: "run-dead",
        status: "error",
        error: "container terminated: out of memory",
        durationMs: 42_000,
        result: "",
        git: { branches: [] },
      },
    });
    try {
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("crashy-worker");
      if (!task) throw new Error("missing task");
      const rec = await mgr.recoverRunning(task);
      if (!rec) throw new Error("recover returned null");
      await mgr.waitAndHandoff(rec);

      expect(mgr.getTask("crashy-worker")?.status).toBe("error");
      const failurePath = join(
        workspace,
        "handoffs",
        "crashy-worker-failure.md"
      );
      expect(existsSync(failurePath)).toBe(true);
      const body = readFileSync(failurePath, "utf8");
      expect(body).toContain("Failure mode: oom");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  // recoverRunning's orphan path returns null without going through
  // waitAndHandoff. exit-on-error still fires on the resulting error
  // transition, so the sidecar must exist for the planner.
  test("Orphan recoverRunning still writes <task>-failure.md", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "orch-fail-orphan-"));
    writePlan(workspace);
    writeFileSync(
      join(workspace, "state.json"),
      JSON.stringify({
        rootSlug: "fail-test",
        attention: [],
        tasks: [
          {
            name: "crashy-worker",
            type: "worker",
            branch: "orch/fail-test/crashy-worker",
            startingRef: "main",
            dependsOn: [],
            agentId: null,
            runId: null,
            parentAgentId: null,
            status: "running",
            resultStatus: null,
            handoffPath: null,
            startedAt: "2026-04-30T00:00:00.000Z",
            finishedAt: null,
            lastUpdate: "2026-04-30T00:01:00.000Z",
            note: "last heartbeat before crash",
            slackTs: null,
          },
        ],
      })
    );
    try {
      const mgr = await AgentManager.load(workspace);
      const task = mgr.getTask("crashy-worker");
      if (!task) throw new Error("missing task");
      const rec = await mgr.recoverRunning(task);
      expect(rec).toBeNull();

      expect(mgr.getTask("crashy-worker")?.status).toBe("error");
      const failurePath = join(
        workspace,
        "handoffs",
        "crashy-worker-failure.md"
      );
      expect(existsSync(failurePath)).toBe(true);
      const body = readFileSync(failurePath, "utf8");
      expect(body).toContain("# crashy-worker failure handoff");
      expect(body).toContain("orphaned");
      expect(body).toContain(
        "Last activity: 2026-04-30T00:01:00.000Z - last heartbeat before crash"
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

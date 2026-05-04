#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type {
  Run,
  RunResult,
  SDKAgent,
  Agent as SDKAgentStatic,
  SDKMessage,
} from "@cursor/sdk";
import { createSlackAdapter } from "../adapters/index.ts";
import { createSlackWebClient } from "../adapters/slack/client.ts";
import type { SlackAdapter, TaskStatus } from "../adapters/types.ts";
import { PlanValidationError } from "../errors.ts";
import type {
  Plan,
  PlanTask,
  RecoverResult,
  SpawnResult,
  State,
  StopResult,
  TaskState,
} from "../schemas.ts";
import {
  parsePlanJson,
  parsePlanValue,
  parseStateJson,
  TASK_NAME_RE,
} from "../schemas.ts";
import type { CommentDestinations } from "./comment-retry-queue.ts";
import { plannedBranchForTask } from "./branches.ts";

const SPAWN_MAX_ATTEMPTS = 3;
const SPAWN_RETRY_BACKOFF_MS = 2_000;
const WAIT_WATCHDOG_POLL_INTERVAL_MS = 60_000;
const WAIT_SSE_IDLE_ATTENTION_MS = 300_000;
const WAIT_TOOL_CALL_IDLE_ATTENTION_MS = 300_000;
// Caps rapid cycling if `run.wait()` errors sub-second while `Agent.getRun`
// still reports running. Without it, state.attention and saveState frequency
// would blow up. Negligible cost when retries take ~1-2 minutes.
const WAIT_RECOVERY_RETRY_BACKOFF_MS = 5_000;

export type RespawnSource = "local-cli" | "self-planner" | "script-auto-retry";

export interface RunInspection {
  task: string;
  agentId: string;
  runId: string;
  drainedMs: number;
  streamed_messages: string[];
  tool_calls_total: number;
  tool_calls_last_5min: number;
  last_assistant_text_snippet: string;
  last_tool_call: ToolCallInspection | null;
}

export interface ToolCallInspection {
  type: "tool_call";
  name?: string;
  status?: string;
  call_id?: string;
  payload_keys: string[];
  payload_snippet: string;
  truncated: boolean;
}

type SlackDisplayKind =
  | "running"
  | "stuck"
  | "completed"
  | "errored"
  | "cancelled";

interface SlackTaskRender {
  emoji: string;
  summary: string;
  text: string;
}

let Agent: typeof SDKAgentStatic;
async function loadSDK(): Promise<typeof SDKAgentStatic> {
  if (Agent) return Agent;
  const mod = await import("@cursor/sdk");
  Agent = mod.Agent;
  return Agent;
}

// Test-only: clears the cached `Agent` so a later `mock.module` reaches
// the SUT. Not for production callers.
export function __resetSDKForTests(): void {
  Agent = undefined as unknown as typeof SDKAgentStatic;
}

/** Cancel a cloud run by IDs, for tools operating outside a loaded workspace
 *  (e.g. `kill-tree` walking across branches). */
export async function cancelCloudRun(opts: {
  apiKey: string;
  agentId: string;
  runId: string;
}): Promise<void> {
  const sdk = await loadSDK();
  const run = await sdk.getRun(opts.runId, {
    runtime: "cloud",
    apiKey: opts.apiKey,
    agentId: opts.agentId,
  });
  if (typeof run.cancel !== "function" || run.supports?.("cancel") === false) {
    throw new Error(
      run.unsupportedReason?.("cancel") ?? "run.cancel unsupported"
    );
  }
  await run.cancel();
}

import {
  applyMeasurementParser,
  checkoutBranchForMeasurement,
  compareMeasurement,
  type MeasurementCheck,
  type MeasurementClaim,
  parseHandoffMeasurements,
  runMeasurementCommand,
} from "../measurements.ts";
import {
  defaultModelForType,
  isKnownModel,
  resolveModelSelection,
} from "../models.ts";
import { AndonPoller, SlackReactionAndonSource } from "./andon.ts";
import { commentRetryQueuePath } from "./comment-retry-queue.ts";
import {
  classifyFailureMode,
  hasStructuredHandoff,
  writeFailureHandoff,
  writeFinishedNoHandoff,
} from "./failure-handoff.ts";
import {
  emptyErrorHandoffBody,
  parseHandoffBranch,
  parseHandoffFailureMode,
  parseHandoffPrNumber,
  parseHandoffVerification,
  resolveRunBranch,
  writeHandoff,
} from "./handoff.ts";
import {
  buildSubplannerPrompt,
  buildVerifierPrompt,
  buildWorkerPrompt,
  type PromptRenderContext,
  renderPromptTemplate,
} from "./prompts.ts";

export class AgentManager {
  readonly workspace: string;
  readonly planPath: string;
  readonly statePath: string;
  readonly handoffsDir: string;
  readonly attentionLog: string;
  readonly plan: Plan;
  state: State;
  private readonly apiKey: string;
  readonly slackAdapter?: SlackAdapter;
  readonly andon: AndonPoller;
  private readonly slackMirrorQueue = new Map<string, Promise<void>>();

  private constructor(args: {
    workspace: string;
    plan: Plan;
    state: State;
    apiKey: string;
    slackAdapter?: SlackAdapter;
  }) {
    this.workspace = args.workspace;
    this.plan = args.plan;
    this.state = args.state;
    this.apiKey = args.apiKey;
    this.slackAdapter = args.slackAdapter;
    this.planPath = join(args.workspace, "plan.json");
    this.statePath = join(args.workspace, "state.json");
    this.handoffsDir = join(args.workspace, "handoffs");
    this.attentionLog = join(args.workspace, "attention.log");
    this.andon = new AndonPoller({
      source:
        this.isRootPlanner() && this.slackAdapter && this.plan.slackKickoffRef
          ? new SlackReactionAndonSource(
              this.slackAdapter,
              this.plan.slackKickoffRef
            )
          : undefined,
      getState: () => this.state,
      saveState: reason => this.saveAndonState(reason),
      logAttention: line => this.logAttention(line),
      pollSource: this.isRootPlanner(),
      cachedState: this.andonCachedState(),
    });
  }

  static async load(
    workspacePath: string,
    opts: { slackChannel?: string } = {}
  ): Promise<AgentManager> {
    const workspace = resolve(workspacePath);
    mkdirSync(workspace, { recursive: true });
    const planPath = join(workspace, "plan.json");
    if (!existsSync(planPath)) {
      throw new PlanValidationError(
        `missing ${planPath} — the planner writes plan.json first; see SKILL.md → Phase 1`
      );
    }
    const parsedPlan = parsePlanJson(readFileSync(planPath, "utf8"), planPath);
    const plan: Plan = {
      ...parsedPlan,
      tasks: parsedPlan.tasks ?? [],
    };
    const apiKey = process.env.CURSOR_API_KEY;
    if (!apiKey) {
      throw new PlanValidationError(
        "CURSOR_API_KEY required; see cursor-sdk/references/auth.md"
      );
    }
    const slackInitAttention: string[] = [];
    const isRootPlanner = planIsRootPlanner(plan);
    if (isRootPlanner && opts.slackChannel && !plan.slackChannel) {
      plan.slackChannel = opts.slackChannel;
      writePlanAtomic(planPath, plan);
    }
    const slackAdapter = slackAdapterForPlan(plan);
    if (!isRootPlanner && !plan.slackKickoffRef) {
      throw new PlanValidationError(
        `${planPath} is a child planner plan missing slackKickoffRef; parent kickoff state must be propagated`
      );
    }
    await ensureSlackKickoff({
      plan,
      planPath,
      isRootPlanner,
      slackAdapter,
      logAttention: line => slackInitAttention.push(line),
    });
    await loadSDK();
    parsePlanValue(plan, planPath);

    const statePath = join(workspace, "state.json");
    const handoffsDir = join(workspace, "handoffs");
    mkdirSync(handoffsDir, { recursive: true });

    let state: State;
    if (existsSync(statePath)) {
      state = parseStateJson(readFileSync(statePath, "utf8"), statePath);
      reconcileStateWithPlan(state, plan);
    } else {
      state = {
        rootSlug: plan.rootSlug,
        tasks: planTasks(plan).map(t => initialTaskState(plan, t)),
        attention: [],
      };
    }

    const mgr = new AgentManager({
      workspace,
      plan,
      state,
      apiKey,
      slackAdapter,
    });
    for (const line of slackInitAttention) {
      if (!mgr.state.attention.some(a => a.message === line)) {
        mgr.logAttention(line);
      }
    }
    // Converge handed-off rows before any verifier respawns against the placeholder.
    for (const handed of mgr.state.tasks) {
      if (handed.status !== "handed-off") continue;
      mgr.reconcileVerifierStartingRefs({
        updatedName: handed.name,
        newBranch: handed.branch,
      });
    }
    mgr.saveState();
    return mgr;
  }

  get tasks(): TaskState[] {
    return this.state.tasks;
  }

  getTask(name: string): TaskState | undefined {
    return this.state.tasks.find(s => s.name === name);
  }

  private isRootPlanner(): boolean {
    return planIsRootPlanner(this.plan);
  }

  private andonCachedState():
    | { workspace: string; ref: string; path: string }
    | undefined {
    if (this.isRootPlanner()) return undefined;
    if (!this.plan.andonStateRef || !this.plan.andonStatePath) return undefined;
    return {
      workspace: this.workspace,
      ref: this.plan.andonStateRef,
      path: this.plan.andonStatePath,
    };
  }

  private planWithAndonCache(): Plan {
    if (!this.plan.slackKickoffRef) return this.plan;
    if (this.plan.andonStateRef && this.plan.andonStatePath) return this.plan;
    const ref = this.currentGitRef();
    const path = this.repoRelativeStatePath();
    if (!ref || !path) return this.plan;
    return {
      ...this.plan,
      andonStateRef: ref,
      andonStatePath: path,
    };
  }

  private currentGitRef(): string | undefined {
    try {
      const branch = execFileSync(
        "git",
        ["-C", this.workspace, "rev-parse", "--abbrev-ref", "HEAD"],
        {
          encoding: "utf8",
          stdio: "pipe",
        }
      ).trim();
      if (branch && branch !== "HEAD") return branch;
      return execFileSync("git", ["-C", this.workspace, "rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
    } catch {
      return undefined;
    }
  }

  private repoRelativeStatePath(): string | undefined {
    try {
      const root = execFileSync(
        "git",
        ["-C", this.workspace, "rev-parse", "--show-toplevel"],
        {
          encoding: "utf8",
          stdio: "pipe",
        }
      ).trim();
      return relative(root, this.statePath);
    } catch {
      return undefined;
    }
  }

  depsSatisfied(task: TaskState): boolean {
    for (const dep of task.dependsOn ?? []) {
      const ds = this.getTask(dep);
      if (!ds || ds.status !== "handed-off") return false;
    }
    return true;
  }

  isAndonRaised(): boolean {
    return this.andon.isActive();
  }

  renderTree(): string {
    const lines: string[] = [
      `${this.plan.rootSlug}/  (${this.state.tasks.length} tasks)`,
    ];
    const rows = this.state.tasks;
    rows.forEach((t, i) => {
      const last = i === rows.length - 1;
      const branch = last ? "└─" : "├─";
      const deps =
        t.dependsOn.length > 0 ? `  deps: ${t.dependsOn.join(", ")}` : "";
      const ids = t.agentId
        ? `  ${t.agentId}${t.runId ? ` / ${t.runId}` : ""}`
        : "";
      const attempts = (t.attempts ?? 0) > 1 ? `  attempts=${t.attempts}` : "";
      const adHoc = t.adHoc ? "  [ad-hoc]" : "";
      lines.push(
        `${branch} ${t.name.padEnd(32)} ${t.type.padEnd(11)} ${t.status.padEnd(11)} ${t.branch}${ids}${attempts}${deps}${adHoc}`
      );
    });
    return lines.join("\n");
  }

  branchForTask(t: PlanTask | TaskState): string {
    const planned = plannedBranchForTask(this.plan, t);
    if ("branch" in t && t.branch.trim().length > 0) {
      const actual = t.branch.trim();
      if (
        (t.type === "worker" || t.type === "subplanner") &&
        actual !== planned
      ) {
        throw new PlanValidationError(
          `${t.name}: branch must be ${planned}, got ${actual}`
        );
      }
      return actual;
    }
    const existing = this.getTask(t.name);
    if (existing?.branch && existing.branch.trim().length > 0) {
      const actual = existing.branch.trim();
      if (
        (t.type === "worker" || t.type === "subplanner") &&
        actual !== planned
      ) {
        throw new PlanValidationError(
          `${t.name}: branch must be ${planned}, got ${actual}`
        );
      }
      return actual;
    }
    return planned;
  }

  /**
   * Propagate `updatedName`'s actual pushed branch to verifiers whose
   * `verifies` matches and whose `startingRef` is still the placeholder.
   * Idempotent; planner-authored overrides are skipped; each propagation
   * logs to `attention.log`.
   */
  reconcileVerifierStartingRefs(args: {
    updatedName: string;
    newBranch: string;
  }): void {
    const { updatedName, newBranch } = args;
    if (!newBranch.trim()) return;
    const placeholder = `orch/${this.plan.rootSlug}/${updatedName}`;
    if (newBranch === placeholder) return;
    for (const dependent of this.state.tasks) {
      if (dependent.type !== "verifier") continue;
      if (dependent.startingRef !== placeholder) continue;
      const planTask = planTasks(this.plan).find(
        t => t.name === dependent.name
      );
      if (!planTask || planTask.type !== "verifier") continue;
      if (planTask.verifies !== updatedName) continue;
      if (planTask.startingRef) continue;
      this.touch(dependent, { startingRef: newBranch });
      this.logAttention(
        `${dependent.name}: startingRef reconciled ${placeholder} -> ${newBranch} (target ${updatedName} handed off on actual branch)`
      );
    }
  }

  /**
   * Re-run each declared `measurements[]` command on the worker's branch
   * and diff against the `## Measurements` self-report. Mismatches log to
   * `attention.log`.
   */
  async checkWorkerMeasurements(
    task: TaskState,
    handoffBody: string
  ): Promise<MeasurementCheck[] | null> {
    const planTask = planTasks(this.plan).find(t => t.name === task.name);
    const measurements = planTask?.measurements ?? [];
    if (measurements.length === 0) return null;
    const reportedBranch = parseHandoffBranch(handoffBody);
    if (!task.branch.trim() || !reportedBranch) {
      this.logAttention(
        `${task.name}: skipped re-measurement; worker did not push a real branch (handoff branch=${reportedBranch ?? "(none)"})`
      );
      return null;
    }
    const parsed = parseHandoffMeasurements(handoffBody);
    if (!parsed) {
      this.logAttention(
        `${task.name}: handoff missing required \`## Measurements\` section; declared measurements=${measurements.map(m => m.name).join(", ")}`
      );
    } else if (parsed.unparsed.length > 0) {
      this.logAttention(
        `${task.name}: \`## Measurements\` had ${parsed.unparsed.length} unparseable line(s); first: ${truncate(parsed.unparsed[0], 120)}`
      );
    }
    const claimByName = new Map<string, MeasurementClaim>();
    for (const claim of parsed?.claims ?? []) {
      claimByName.set(claim.name, claim);
    }
    let checkout: { dir: string; cleanup: () => void } | null = null;
    try {
      checkout = checkoutBranchForMeasurement({
        branch: task.branch,
        repoUrl: this.plan.repoUrl,
      });
    } catch (err) {
      this.logAttention(
        `${task.name}: re-measurement clone failed (${truncate(errorMessage(err), 200)}); skipping ${measurements.length} measurement(s)`
      );
      return null;
    }
    const checks: MeasurementCheck[] = [];
    try {
      for (const spec of measurements) {
        const run = runMeasurementCommand({
          command: spec.command,
          cwd: checkout.dir,
        });
        if (!run.ok) {
          checks.push({
            name: spec.name,
            command: spec.command,
            measured: "",
            measuredNumeric: null,
            claim: claimByName.get(spec.name) ?? null,
            outcome: "command-failed",
            driftFraction: null,
            detail: run.reason,
          });
          continue;
        }
        const parsedValue = applyMeasurementParser(spec.parser, run.stdout);
        if (!parsedValue.ok) {
          checks.push({
            name: spec.name,
            command: spec.command,
            measured: "",
            measuredNumeric: null,
            claim: claimByName.get(spec.name) ?? null,
            outcome: "parse-failed",
            driftFraction: null,
            detail: parsedValue.reason,
          });
          continue;
        }
        checks.push(
          compareMeasurement({
            spec,
            measured: parsedValue.value,
            claim: claimByName.get(spec.name) ?? null,
          })
        );
      }
    } finally {
      checkout.cleanup();
    }
    const mismatches = checks.filter(c => c.outcome !== "match");
    if (mismatches.length > 0) {
      for (const check of mismatches) {
        this.logAttention(
          `${task.name}: measurement_mismatch ${check.name} [${check.outcome}] ${check.detail}`
        );
      }
    }
    return checks;
  }

  private startingRefForTask(t: PlanTask, s: TaskState): string {
    if (t.startingRef) return t.startingRef;
    switch (t.type) {
      case "worker":
      case "subplanner":
        return s.startingRef;
      case "verifier": {
        const target = planTasks(this.plan).find(x => x.name === t.verifies);
        if (target) return this.branchForTask(target);
        return s.startingRef;
      }
      default: {
        const _exhaustive: never = t;
        return _exhaustive;
      }
    }
  }

  /**
   * Spawn a cloud agent for `def`. One call = one logical attempt (bumps
   * `attempts`), with an inner transient-retry loop for network hiccups.
   * Returns null on final failure; state is left as error + attention entry.
   */
  async spawnTask(
    def: PlanTask,
    options: { adHoc?: boolean } = {}
  ): Promise<SpawnResult | null> {
    if (!TASK_NAME_RE.test(def.name)) {
      throw new PlanValidationError(
        `task.name must be kebab-case ascii (no path traversal): got ${JSON.stringify(def.name)}`
      );
    }

    let s = this.getTask(def.name);
    if (!s) {
      s = {
        ...initialTaskState(this.plan, def),
        adHoc: options.adHoc ?? false,
      };
      this.state.tasks.push(s);
      this.saveState();
    }
    const attemptsBefore = s.attempts ?? 0;
    if (def.maxAttempts != null && attemptsBefore >= def.maxAttempts) {
      const msg = `exceeded maxAttempts=${def.maxAttempts} (attempts=${attemptsBefore}); planner must bump maxAttempts or abandon this task`;
      this.touch(s, { status: "error", note: msg, failureMode: "unknown" });
      this.logAttention(`${def.name}: ${msg}`);
      return null;
    }

    const attemptNumber = attemptsBefore + 1;
    this.touch(s, { attempts: attemptNumber });

    if (def.model && !isKnownModel(def.model)) {
      this.logAttention(
        `${def.name}: model "${def.model}" not in MODEL_CATALOG (spawning anyway). Run \`bun cli.ts models\` to see known slugs.`
      );
    }

    let lastErr: unknown = null;
    for (let subAttempt = 1; subAttempt <= SPAWN_MAX_ATTEMPTS; subAttempt++) {
      try {
        const startingRef = this.startingRefForTask(def, s);
        if (startingRef !== s.startingRef) {
          this.touch(s, { startingRef });
        }
        const agent = await Agent.create({
          apiKey: this.apiKey,
          name: `${this.plan.rootSlug}/${def.name}`,
          model: resolveModelSelection(
            def.model ?? defaultModelForType(def.type)
          ),
          cloud: {
            repos: [{ url: this.plan.repoUrl, startingRef }],
            autoCreatePR: def.openPR ?? false,
          },
        });
        // Persist IDs only after send() succeeds; a crash before run creation
        // should recover as an orphaned spawn.
        this.touch(s, {
          agentId: null,
          status: "running",
          startedAt: new Date().toISOString(),
        });
        const promptCtx: PromptRenderContext = {
          plan: this.planWithAndonCache(),
          branchForTask: task => this.branchForTask(task),
          getTask: name => this.getTask(name),
          readHandoff: taskName => this.readHandoff(taskName),
        };
        let prompt: string;
        switch (def.type) {
          case "worker":
            prompt = buildWorkerPrompt(def, agent.agentId, promptCtx);
            break;
          case "subplanner":
            prompt = buildSubplannerPrompt(def, agent.agentId, promptCtx);
            break;
          case "verifier":
            prompt = buildVerifierPrompt(def, agent.agentId, promptCtx);
            break;
        }
        const run = await agent.send(prompt);
        this.touch(s, {
          agentId: agent.agentId,
          runId: run.id,
          parentAgentId: this.plan.selfAgentId ?? null,
        });
        if (subAttempt > 1) {
          this.logAttention(
            `${def.name}: transient-retry succeeded on sub-attempt ${subAttempt}`
          );
        }
        return { kind: "spawned", agent, run, s };
      } catch (err) {
        lastErr = err;
        if (subAttempt < SPAWN_MAX_ATTEMPTS) {
          await sleep(SPAWN_RETRY_BACKOFF_MS * subAttempt);
        }
      }
    }
    const errText = truncate(String(lastErr), 200);
    const hint = errText.includes("invalid_model")
      ? ` run \`bun cli.ts models --check\` to re-probe the catalog against /v1/agents.`
      : "";
    const msg = `spawn failed after ${SPAWN_MAX_ATTEMPTS} transient sub-attempts: ${errText}${hint}`;
    this.touch(s, {
      status: "error",
      note: msg,
      failureMode: classifyFailureMode({
        sdkError: msg,
        durationMs: null,
        lastOutput: null,
      }),
    });
    this.logAttention(`${def.name}: ${msg}`);
    return null;
  }

  /** Reset a terminal task to pending; the next `run` re-spawns it. */
  respawnTask(
    taskName: string,
    options: { source?: RespawnSource } = {}
  ): TaskState {
    const s = this.getTask(taskName);
    if (!s) throw new Error(`unknown task: ${taskName}`);
    if (s.status === "running") {
      throw new Error(
        `task ${taskName} is still running; use \`kill\` first if you really want to respawn`
      );
    }
    if (s.status === "handed-off") {
      throw new Error(
        `task ${taskName} already handed off; add a new task to plan.json if you want another attempt`
      );
    }
    const prevStatus = s.status;
    const source = options.source ?? "local-cli";
    // Subplanners resume from their own branch: the prior state.json and
    // committed handoffs inherit into the new clone, so the resumed subplanner
    // skips children that already handed off. Workers have no such internal
    // state; keep their original startingRef.
    const resume = s.type === "subplanner" && (s.attempts ?? 0) > 0;
    this.touch(s, {
      status: "pending",
      agentId: null,
      runId: null,
      resultStatus: null,
      handoffPath: null,
      prNumber: null,
      failureMode: null,
      startedAt: null,
      finishedAt: null,
      startingRef: resume ? s.branch : s.startingRef,
      note: `respawned by ${source} (was ${prevStatus}; attempts=${s.attempts ?? 0})`,
    });
    this.logAttention(
      `${taskName}: respawned by ${source} (was ${prevStatus})${resume ? `; resuming from ${s.branch}` : ""}`
    );
    return s;
  }

  /** Re-attach to a task still `running` after a script restart. */
  async recoverRunning(s: TaskState): Promise<RecoverResult | null> {
    if (!s.agentId && !s.runId) {
      this.recordRecoverFailure(
        s,
        "orphaned — status was `running` but no agentId or runId recorded (likely crashed mid-spawn)"
      );
      return null;
    }
    if (!s.runId) {
      this.recordRecoverFailure(
        s,
        "orphaned — had agentId but no runId on restart"
      );
      return null;
    }
    if (!s.agentId) {
      this.recordRecoverFailure(
        s,
        "orphaned — had runId but no agentId on restart"
      );
      return null;
    }
    try {
      const run = await Agent.getRun(s.runId, {
        runtime: "cloud",
        apiKey: this.apiKey,
        agentId: s.agentId,
      });
      return { kind: "recovered", run, s };
    } catch (err) {
      this.recordRecoverFailure(
        s,
        `recover failed: ${truncate(errorMessage(err), 200)}`
      );
      return null;
    }
  }

  // Every error-status transition needs a `<task>-failure.md` sidecar so the
  // exit-on-error log message ("See handoffs/<task>-failure.md") points at a
  // real file. Captures `lastUpdate`/`note` before `touch` clobbers them.
  private recordRecoverFailure(s: TaskState, msg: string): void {
    const lastActivityAt = s.lastUpdate;
    const lastActivityNote = s.note;
    const failureMode = classifyFailureMode({
      sdkError: msg,
      durationMs: null,
      lastOutput: null,
    });
    this.touch(s, { status: "error", note: msg, failureMode });
    this.logAttention(`${s.name}: ${msg}`);
    try {
      const terminatedAt = new Date().toISOString();
      const sidecarPath = writeFailureHandoff({
        handoffsDir: this.handoffsDir,
        task: s,
        failureMode,
        sdkError: msg,
        lastActivityAt,
        lastActivityNote,
        lastToolCall: null,
        terminatedAt,
      });
      this.logAttention(
        `${s.name}: synthetic failure handoff written to ${sidecarPath} (recover failed)`
      );
    } catch (writeErr) {
      this.logAttention(
        `${s.name}: failed to write synthetic failure handoff: ${truncate(errorMessage(writeErr), 200)}`
      );
    }
  }

  /**
   * Wait for a run to finish, write its final message as a handoff, update
   * state. Prefers `rr.result` (the final assistant message); falls back to
   * the stream concat if unset. Writes the handoff file before touching
   * state so downstream tasks never see status=handed-off with a missing file.
   */
  async waitAndHandoff(result: SpawnResult | RecoverResult): Promise<void> {
    let { run } = result;
    const { s } = result;
    const agent = agentForWaitResult(result);
    let accumulatedText = "";
    let handoffSucceeded = false;
    let handoffBody: string | null = null;
    let handoffBranch: string | null = null;
    const lastToolCallAt = { value: null as number | null };
    const lastToolCallName = { value: null as string | null };
    let lastWaitError: string | null = null;
    // Hoisted so the failure-sidecar paths can record the actual last
    // heartbeat. `this.touch` clobbers `task.lastUpdate` to "now" before
    // the sidecar writes, so the fallback inside writeFailureHandoff
    // would otherwise show the termination time as "last activity".
    const lastSseActivityAt = { value: Date.now() };
    try {
      let rr: RunResult;
      for (let recoveryAttempt = 1; ; recoveryAttempt++) {
        lastSseActivityAt.value = Date.now();
        const streamPromise = (async () => {
          try {
            for await (const event of run.stream()) {
              lastSseActivityAt.value = Date.now();
              if (event.type === "tool_call") {
                lastToolCallAt.value = Date.now();
                if (typeof event.name === "string") {
                  lastToolCallName.value = event.name;
                }
              }
              if (event.type !== "assistant") continue;
              for (const block of event.message.content) {
                if (block.type === "text" && typeof block.text === "string") {
                  accumulatedText += block.text;
                }
              }
            }
          } catch {
            // Stream errors are non-fatal; run.wait() is authoritative.
          }
        })();
        try {
          rr = await waitRunWithWatchdog({
            run,
            agentId: s.agentId ?? run.agentId,
            runId: s.runId ?? run.id,
            apiKey: this.apiKey,
            lastSseActivityAt,
            lastToolCallAt,
            logAttention: line => this.logAttention(line),
            taskLabel: s.name,
          });
        } catch (waitErr) {
          lastWaitError = errorMessage(waitErr);
          throw waitErr;
        }
        await streamPromise;
        if (rr.status !== "error") break;
        lastWaitError = runResultErrorMessage(rr) ?? lastWaitError;

        const agentId = s.agentId ?? run.agentId;
        const runId = s.runId ?? run.id;
        let freshRun: Run;
        try {
          freshRun = await Agent.getRun(runId, {
            runtime: "cloud",
            apiKey: this.apiKey,
            agentId,
          });
        } catch (probeErr) {
          this.logAttention(
            `${s.name}: run.wait returned status=error; recovery probe failed, accepting error: ${truncate(String(probeErr), 200)}`
          );
          break;
        }

        if (freshRun.status !== "running") {
          rr = await freshRun.wait();
          this.logAttention(
            `${s.name}: run.wait returned status=error; recovery probe found terminal status=${rr.status}, accepting authoritative status`
          );
          break;
        }

        // Agent.getRun is authoritative. Retry without a cap: the watchdog
        // inside waitRunWithWatchdog polls Agent.getRun every 60s and wins
        // the race whenever REST flips to terminal, so a genuinely stuck
        // server can't hang this loop any worse than the watchdog already
        // allows. A prior cap of 3 truncated legitimate long recoveries
        // (subplanners running 3h+ with repeated SSE drops).
        this.logAttention(
          `${s.name}: run.wait returned status=error but Agent.getRun still reports running; treating as dropped stream and retrying wait (attempt ${recoveryAttempt})`
        );
        await sleep(WAIT_RECOVERY_RETRY_BACKOFF_MS);
        run = freshRun;
      }
      let body = rr.result?.trim() || accumulatedText;
      if (!body && rr.status === "error") {
        body = emptyErrorHandoffBody({
          task: s,
          result: rr,
          renderTemplate: renderPromptTemplate,
        });
      }
      const runBranch = resolveRunBranch({
        handoffBody: body,
        runBranches: rr.git?.branches ?? [],
        fallback: s.branch,
      });
      if (runBranch !== s.branch) {
        s.branch = runBranch;
      }
      const prNumber = parseHandoffPrNumber(body);
      const sdkError =
        rr.status === "finished" ? null : runResultErrorMessage(rr) ?? lastWaitError;
      const failureMode =
        parseHandoffFailureMode(body) ??
        (rr.status === "finished"
          ? null
          : classifyFailureMode({
              sdkError,
              durationMs: rr.durationMs ?? null,
              lastOutput: body,
            }));
      const finishedAt = new Date().toISOString();
      const resultStatus = rr.status;
      const nextStatus: TaskStatus =
        rr.status === "finished" ? "handed-off" : "error";
      const handoffPath = writeHandoff({
        handoffsDir: this.handoffsDir,
        task: s,
        body,
        resultStatus,
        finishedAt,
      });
      this.touch(s, {
        branch: runBranch,
        resultStatus,
        status: nextStatus,
        finishedAt,
        handoffPath: `handoffs/${s.name}.md`,
        prNumber,
        failureMode,
      });
      const lastActivityAt = new Date(lastSseActivityAt.value).toISOString();
      // Sidecar writes are wrapped so a disk-full or rename failure can't
      // unwind the just-committed handed-off status via the outer catch.
      if (rr.status !== "finished") {
        this.logAttention(
          `${s.name}: run ended with status=${rr.status}; see ${handoffPath}`
        );
        try {
          const sidecarPath = writeFailureHandoff({
            handoffsDir: this.handoffsDir,
            task: s,
            failureMode: failureMode ?? "unknown",
            sdkError,
            lastActivityAt,
            lastToolCall: lastToolCallName.value,
            terminatedAt: finishedAt,
          });
          this.logAttention(
            `${s.name}: synthetic failure handoff written to ${sidecarPath}`
          );
        } catch (writeErr) {
          this.logAttention(
            `${s.name}: failed to write synthetic failure handoff: ${truncate(errorMessage(writeErr), 200)}`
          );
        }
      } else if (!hasStructuredHandoff(body)) {
        try {
          const sidecarPath = writeFinishedNoHandoff({
            handoffsDir: this.handoffsDir,
            task: s,
            resultStatus,
            terminatedAt: finishedAt,
            rawBodySnippet: body,
          });
          this.logAttention(
            `${s.name}: finished-no-handoff written to ${sidecarPath} (run status=${resultStatus} but no \`## Status\` section produced)`
          );
        } catch (writeErr) {
          this.logAttention(
            `${s.name}: failed to write finished-no-handoff sidecar: ${truncate(errorMessage(writeErr), 200)}`
          );
        }
      }
      handoffSucceeded = rr.status === "finished";
      handoffBody = body;
      handoffBranch = runBranch;
    } catch (err) {
      const errMsg = errorMessage(err);
      const failureMode = classifyFailureMode({
        sdkError: errMsg,
        durationMs: null,
        lastOutput: accumulatedText,
      });
      this.touch(s, {
        status: "error",
        note: `wait failed: ${truncate(errMsg, 200)}`,
        failureMode,
      });
      this.logAttention(`${s.name}: wait threw: ${errMsg}`);
      // A throw skipped the normal handoff write; leave a sidecar so the
      // planner's next turn isn't staring at a silent error transition.
      try {
        const terminatedAt = new Date().toISOString();
        const sidecarPath = writeFailureHandoff({
          handoffsDir: this.handoffsDir,
          task: s,
          failureMode,
          sdkError: errMsg,
          lastActivityAt: new Date(lastSseActivityAt.value).toISOString(),
          lastToolCall: lastToolCallName.value,
          terminatedAt,
        });
        this.logAttention(
          `${s.name}: synthetic failure handoff written to ${sidecarPath} (wait threw before handoff)`
        );
      } catch (writeErr) {
        this.logAttention(
          `${s.name}: failed to write synthetic failure handoff: ${truncate(errorMessage(writeErr), 200)}`
        );
      }
    } finally {
      if (agent) {
        await Promise.resolve(agent[Symbol.asyncDispose]()).catch(() => {});
      }
    }
    // Post-handoff reconciliation runs outside the try so a failure here
    // can't clobber the handoff status that was just committed. Only fires
    // on a successful run: an errored run may have pushed to a real branch,
    // and propagating that ref would stick verifiers on the failed attempt
    // even after a respawn lands on a different branch. Reconcile and the
    // measurement re-check are isolated so a throw in one cannot silently
    // skip the other.
    if (handoffSucceeded && handoffBranch !== null && handoffBody !== null) {
      try {
        this.reconcileVerifierStartingRefs({
          updatedName: s.name,
          newBranch: handoffBranch,
        });
      } catch (err) {
        this.logAttention(
          `${s.name}: reconcileVerifierStartingRefs threw: ${errorMessage(err)}`
        );
      }
      try {
        await this.checkWorkerMeasurements(s, handoffBody);
      } catch (err) {
        this.logAttention(
          `${s.name}: checkWorkerMeasurements threw: ${errorMessage(err)}`
        );
      }
      try {
        this.recordHandoffVerification(s, handoffBody);
      } catch (err) {
        this.logAttention(
          `${s.name}: recordHandoffVerification threw: ${errorMessage(err)}`
        );
      }
    }
  }

  /**
   * Persist the `## Verification` claim from a handoff body. Verifier
   * verdicts land on the *target* task's row (looked up via
   * `plan.tasks[].verifies`); worker and subplanner self-reports land on
   * their own row. A later verifier handoff overwrites the self-report
   * because verifiers always depend on (and so hand off after) their target.
   */
  recordHandoffVerification(task: TaskState, handoffBody: string): void {
    const verification = parseHandoffVerification(handoffBody);
    if (!verification) return;
    if (task.type === "verifier") {
      const planTask = planTasks(this.plan).find(t => t.name === task.name);
      if (!planTask || planTask.type !== "verifier") return;
      const target = this.getTask(planTask.verifies);
      if (!target) return;
      if (target.verification === verification) return;
      this.touch(target, { verification });
      this.logAttention(
        `${target.name}: verification recorded (${verification}) by verifier ${task.name}`
      );
      return;
    }
    if (task.verification === verification) return;
    this.touch(task, { verification });
    this.logAttention(
      `${task.name}: verification self-reported (${verification})`
    );
  }

  async cancel(taskName: string): Promise<void> {
    const s = this.getTask(taskName);
    if (!s) throw new Error(`unknown task: ${taskName}`);
    if (!s.runId)
      throw new Error(`task ${taskName} has no runId (status=${s.status})`);
    if (!s.agentId)
      throw new Error(`task ${taskName} has no agentId (status=${s.status})`);
    const run = await Agent.getRun(s.runId, {
      runtime: "cloud",
      apiKey: this.apiKey,
      agentId: s.agentId,
    });
    if (
      typeof run.cancel !== "function" ||
      run.supports?.("cancel") === false
    ) {
      throw new Error(
        run.unsupportedReason?.("cancel") ?? "run.cancel unsupported"
      );
    }
    await run.cancel();
    this.touch(s, {
      status: "cancelled",
      note: "cancelled by operator via cli",
    });
    this.logAttention(`${s.name}: cancelled by operator`);
  }

  /**
   * Stop a task: cancel if running, prune if pending. If the SDK cancel fails
   * (backend drift, stale agentId), mark error locally so the operator isn't
   * stuck. Terminal tasks are no-op.
   */
  async stopTask(taskName: string): Promise<StopResult> {
    const s = this.getTask(taskName);
    if (!s) throw new Error(`unknown task: ${taskName}`);
    if (s.status === "running") {
      try {
        await this.cancel(taskName);
        return { name: taskName, action: "cancelled" };
      } catch (err) {
        const msg = errorMessage(err);
        const failureMode = classifyFailureMode({
          sdkError: msg,
          durationMs: null,
          lastOutput: null,
        });
        this.touch(s, {
          status: "error",
          note: `cancel failed; orphaned on backend: ${truncate(msg, 200)}`,
          failureMode,
        });
        this.logAttention(
          `${s.name}: cancel failed (${msg}); marked error. Cloud agent may still be running — check via Agent.list.`
        );
        return { name: taskName, action: "cancelled" };
      }
    }
    if (s.status === "pending") {
      this.touch(s, { status: "pruned", note: "pruned by operator via cli" });
      this.logAttention(`${s.name}: pruned before spawn (operator)`);
      return { name: taskName, action: "pruned" };
    }
    return { name: taskName, action: "noop", previousStatus: s.status };
  }

  /** Stop a task and transitively prune every pending descendant. */
  async stopTaskCascade(taskName: string): Promise<StopResult[]> {
    const primary = await this.stopTask(taskName);
    const results: StopResult[] = [primary];
    const toVisit = [taskName];
    const seen = new Set<string>([taskName]);
    while (toVisit.length > 0) {
      const current = toVisit.shift();
      if (current === undefined) break;
      for (const candidate of this.state.tasks) {
        if (seen.has(candidate.name)) continue;
        if (!candidate.dependsOn.includes(current)) continue;
        if (candidate.status !== "pending" && candidate.status !== "running")
          continue;
        seen.add(candidate.name);
        toVisit.push(candidate.name);
        const r = await this.stopTask(candidate.name);
        if (r.action !== "noop") results.push(r);
      }
    }
    return results;
  }

  async stopAll(): Promise<StopResult[]> {
    const results: StopResult[] = [];
    for (const s of this.state.tasks) {
      if (s.status !== "pending" && s.status !== "running") continue;
      results.push(await this.stopTask(s.name));
    }
    return results;
  }

  async *tail(taskName: string): AsyncGenerator<SDKMessage> {
    const s = this.getTask(taskName);
    if (!s) throw new Error(`unknown task: ${taskName}`);
    if (!s.runId)
      throw new Error(`task ${taskName} has no runId (status=${s.status})`);
    if (!s.agentId)
      throw new Error(`task ${taskName} has no agentId (status=${s.status})`);
    const run = await Agent.getRun(s.runId, {
      runtime: "cloud",
      apiKey: this.apiKey,
      agentId: s.agentId,
    });
    yield* run.stream();
  }

  async inspectTask(
    taskName: string,
    timeoutMs: number
  ): Promise<RunInspection> {
    const s = this.getTask(taskName);
    if (!s) throw new Error(`unknown task: ${taskName}`);
    if (!s.runId)
      throw new Error(`task ${taskName} has no runId (status=${s.status})`);
    if (!s.agentId)
      throw new Error(`task ${taskName} has no agentId (status=${s.status})`);
    const run = await Agent.getRun(s.runId, {
      runtime: "cloud",
      apiKey: this.apiKey,
      agentId: s.agentId,
    });
    return inspectRunStream({
      run,
      task: taskName,
      agentId: s.agentId,
      runId: s.runId,
      timeoutMs,
    });
  }

  readHandoff(taskName: string): string | null {
    const s = this.getTask(taskName);
    if (!s?.handoffPath) return null;
    const p = join(this.workspace, s.handoffPath);
    return existsSync(p) ? readFileSync(p, "utf8") : null;
  }

  commentDestinations(): CommentDestinations {
    return { slack: this.slackAdapter };
  }

  saveState(): void {
    const tmp = `${this.statePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    renameSync(tmp, this.statePath);
  }

  savePlan(): void {
    const tmp = `${this.planPath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.plan, null, 2));
    renameSync(tmp, this.planPath);
  }

  private saveAndonState(reason?: string): void {
    this.saveState();
    if (reason && this.plan.syncStateToGit) {
      this.commitStateSnapshot(reason);
    }
  }

  touch(task: TaskState, patch: Partial<TaskState>): void {
    const prevStatus = task.status;
    const prevAgentId = task.agentId;
    Object.assign(task, patch, { lastUpdate: new Date().toISOString() });
    this.saveState();
    const statusChanged = !!patch.status && patch.status !== prevStatus;
    if (statusChanged) {
      if (this.plan.syncStateToGit) {
        this.commitStateSnapshot(
          `${task.name} ${prevStatus} -> ${task.status}`
        );
      }
    }
    // Re-mirror when agentId transitions from null to a real id so the footer
    // link appears mid-run. Spawn ordering sets status="running" with
    // agentId=null first (orphan-recovery soundness), then fills agentId after
    // agent.send() resolves; without this re-mirror, the footer would only
    // appear at terminal status.
    const agentIdLanded =
      "agentId" in patch && !!task.agentId && task.agentId !== prevAgentId;
    if (statusChanged || agentIdLanded) {
      this.enqueueSlackMirror(task);
    }
  }

  syncStateToGit(reason: string): void {
    this.saveState();
    if (this.plan.syncStateToGit) {
      this.commitStateSnapshot(reason);
    }
  }

  private async mirrorTaskToSlack(
    task: TaskState,
    rendered = this.slackRenderForTask(task)
  ): Promise<void> {
    const kickoffRef = this.plan.slackKickoffRef;
    if (!this.slackAdapter || !kickoffRef) return;
    if (!rendered) return;
    if (
      task.slackTs &&
      task.slackRendered?.emoji === rendered.emoji &&
      task.slackRendered.summary === rendered.summary
    ) {
      return;
    }
    const ref = task.slackTs
      ? await this.slackAdapter.editThreadMessage({
          threadTs: kickoffRef.ts,
          ts: task.slackTs,
          text: rendered.text,
        })
      : await this.slackAdapter.postInThread({
          threadTs: kickoffRef.ts,
          username: task.name,
          text: rendered.text,
        });
    task.slackTs = ref.ts;
    task.slackRendered = {
      emoji: rendered.emoji,
      summary: rendered.summary,
    };
    this.syncStateToGit(`${task.name} slack mirror`);
  }

  private enqueueSlackMirror(task: TaskState): void {
    const rendered = this.slackRenderForTask(task);
    if (!rendered) return;
    const previous = this.slackMirrorQueue.get(task.name) ?? Promise.resolve();
    let next: Promise<void>;
    next = previous
      .catch(() => {})
      .then(() => this.mirrorTaskToSlack(task, rendered))
      .catch(err => {
        this.logAttention(
          `${task.name}: slack mirror failed: ${truncate(errorMessage(err), 200)}`
        );
      })
      .finally(() => {
        if (this.slackMirrorQueue.get(task.name) === next) {
          this.slackMirrorQueue.delete(task.name);
        }
      });
    this.slackMirrorQueue.set(task.name, next);
  }

  private slackRenderForTask(task: TaskState): SlackTaskRender | null {
    const status = this.slackDisplayStatus(task);
    if (!status) return null;
    const summary = this.slackSummaryForTask(task, status.kind);
    return {
      emoji: status.emoji,
      summary,
      text: summary
        ? `${status.emoji} ${status.label}\n${summary}`
        : `${status.emoji} ${status.label}`,
    };
  }

  private slackDisplayStatus(
    task: TaskState
  ): { kind: SlackDisplayKind; emoji: string; label: string } | null {
    if (task.status === "pending") return null;
    if (task.status === "running" && this.latestIdleWarningMs(task) !== null) {
      return { kind: "stuck", emoji: "⚠", label: "stuck" };
    }
    switch (task.status) {
      case "running":
        return { kind: "running", emoji: "▶︎", label: "running" };
      case "handed-off":
        return { kind: "completed", emoji: "✓", label: "completed" };
      case "error":
        return { kind: "errored", emoji: "✗", label: "errored" };
      case "cancelled":
      case "pruned":
        return { kind: "cancelled", emoji: "⊘", label: "cancelled" };
      default: {
        const _exhaustive: never = task.status;
        return _exhaustive;
      }
    }
  }

  private slackSummaryForTask(
    task: TaskState,
    kind: SlackDisplayKind
  ): string {
    const view = formatAgentFooter(task.agentId);
    switch (kind) {
      case "running":
        return appendSlackView(
          `started ${formatElapsedMinutes(task.startedAt)} ago`,
          view
        );
      case "stuck": {
        const idleMs = this.latestIdleWarningMs(task);
        return appendSlackView(
          `no activity for ${formatDurationMinutes(idleMs ?? 0)}`,
          view
        );
      }
      case "completed":
        return appendSlackView(this.completedSummary(task), view);
      case "errored":
        return appendSlackView(failureModeText(task.failureMode), view);
      case "cancelled":
        return view;
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }

  private completedSummary(task: TaskState): string {
    if (task.prNumber) {
      const repo = githubRepoFromRemote(this.plan.repoUrl);
      if (repo) {
        return `opened <https://review.cursor.com/github/${repo.owner}/${repo.repo}/pull/${task.prNumber}|#${task.prNumber}>`;
      }
      return `opened #${task.prNumber}`;
    }
    return this.diffStatsForTask(task) ?? "";
  }

  private diffStatsForTask(task: TaskState): string | null {
    const branch = task.branch.trim();
    const base = (this.plan.prBase ?? this.plan.baseBranch).trim();
    if (!branch || !base || branch === base) return null;
    const range = `${base}...${branch}`;
    const log = this.gitOutput(["log", "--oneline", range, "--"]);
    if (!log?.trim()) return null;
    const shortstat = this.gitOutput(["diff", "--shortstat", range, "--"]);
    return shortstat ? formatGitShortstat(shortstat) : null;
  }

  private gitOutput(args: string[]): string | null {
    try {
      return execFileSync("git", ["-C", this.workspace, ...args], {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      });
    } catch {
      return null;
    }
  }

  private latestIdleWarningMs(task: TaskState): number | null {
    for (const entry of [...this.state.attention].reverse()) {
      if (!entry.message.startsWith(`${task.name}:`)) continue;
      const idleMs = parseIdleWarningMs(entry.message);
      if (idleMs !== null) return idleMs;
    }
    return null;
  }

  /**
   * Commit and push state.json + plan.json so remote observers can
   * `bun cli.ts crawl`. Called only on status transitions, not every
   * `lastUpdate`.
   */
  private commitStateSnapshot(reason: string): void {
    const gitExec = (args: string[]): void => {
      execFileSync("git", ["-C", this.workspace, ...args], { stdio: "pipe" });
    };
    const hasStagedDiff = (paths: string[]): boolean => {
      try {
        gitExec(["diff", "--cached", "--quiet", "--", ...paths]);
        return false;
      } catch {
        return true;
      }
    };
    try {
      gitExec(["rev-parse", "--show-toplevel"]);
    } catch {
      return;
    }
    try {
      const addPaths = [this.statePath, this.planPath, this.handoffsDir];
      const retryQueuePath = commentRetryQueuePath(this.workspace);
      if (existsSync(retryQueuePath)) addPaths.push(retryQueuePath);
      gitExec(["add", ...addPaths]);
      if (!hasStagedDiff(addPaths)) {
        gitExec(["push"]);
        return;
      }
      gitExec(["commit", "-m", `orch: ${this.plan.rootSlug} ${reason}`]);
      gitExec(["push"]);
    } catch (err) {
      this.logAttention(
        `git-sync failed (${reason}): ${truncate(errorMessage(err), 200)}`
      );
    }
  }

  logAttention(line: string): void {
    const ts = new Date().toISOString();
    appendFileSync(this.attentionLog, `[${ts}] ${line}\n`);
    this.state.attention.push({ at: ts, message: line });
    this.saveState();
    const taskName = line.split(":", 1)[0];
    const task = this.getTask(taskName);
    if (task?.status === "running" && parseIdleWarningMs(line) !== null) {
      this.enqueueSlackMirror(task);
    }
  }
}

/**
 * Reconcile state against the current plan on load: append new tasks, sync
 * dependsOn on pending rows, prune pending rows whose task was removed from
 * plan.json. Leaves terminal and running rows untouched.
 */
function reconcileStateWithPlan(state: State, plan: Plan): void {
  const tasks = planTasks(plan);
  const planByName = new Map(tasks.map(t => [t.name, t]));

  for (const t of tasks) {
    if (!state.tasks.find(s => s.name === t.name)) {
      state.tasks.push(initialTaskState(plan, t));
    }
  }

  for (const s of state.tasks) {
    if (s.status !== "pending") continue;
    const planTask = planByName.get(s.name);
    if (planTask) {
      s.dependsOn = normalizedDependsOn(planTask);
      s.slackTs = s.slackTs ?? planTask.slackTs ?? null;
    }
    if (!planTask && !s.adHoc) {
      s.status = "pruned";
      s.note = "orphaned: removed from plan.json; auto-pruned on load";
      s.lastUpdate = new Date().toISOString();
      state.attention.push({
        at: s.lastUpdate,
        message: `${s.name}: auto-pruned on load because it was removed from plan.json`,
      });
    }
  }
}

function initialTaskState(plan: Plan, t: PlanTask): TaskState {
  return {
    name: t.name,
    type: t.type,
    branch: plannedBranchForTask(plan, t),
    startingRef: t.startingRef ?? defaultStartingRefForTask(plan, t),
    dependsOn: normalizedDependsOn(t),
    agentId: null,
    runId: null,
    parentAgentId: null,
    status: "pending",
    resultStatus: null,
    handoffPath: null,
    startedAt: null,
    finishedAt: null,
    lastUpdate: null,
    note: null,
    slackTs: t.slackTs ?? null,
    prNumber: null,
    failureMode: null,
    verification: null,
  };
}

function defaultStartingRefForTask(plan: Plan, t: PlanTask): string {
  switch (t.type) {
    case "worker":
      return plan.baseBranch;
    case "subplanner":
      return plan.baseBranch;
    case "verifier":
      return `orch/${plan.rootSlug}/${t.verifies}`;
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

function normalizedDependsOn(t: PlanTask): string[] {
  const deps = [...(t.dependsOn ?? [])];
  switch (t.type) {
    case "worker":
    case "subplanner":
      return deps;
    case "verifier":
      if (!deps.includes(t.verifies)) {
        deps.unshift(t.verifies);
      }
      return deps;
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

function planTasks(plan: Plan): PlanTask[] {
  return plan.tasks ?? [];
}

function agentForWaitResult(
  result: SpawnResult | RecoverResult
): SDKAgent | undefined {
  switch (result.kind) {
    case "spawned":
      return result.agent;
    case "recovered":
      return undefined;
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function planSlackChannel(plan: Plan): string | undefined {
  return plan.slackChannel ?? plan.slackKickoffRef?.channel;
}

function slackAdapterForPlan(plan: Plan): SlackAdapter | undefined {
  // SLACK_BOT_TOKEN missing is signalled once via console.error inside
  // createSlackWebClient. Don't double-log to attention.log: env config
  // belongs to the operator surface, not workspace-visible state.
  const channel = planSlackChannel(plan);
  if (!channel) {
    // Surface the missing-token signal even when the channel is also unset,
    // so an operator who expected Slack visibility sees a single console line
    // explaining why it's off.
    if (!process.env.SLACK_BOT_TOKEN) createSlackWebClient();
    return undefined;
  }
  return createSlackAdapter(channel);
}

async function ensureSlackKickoff(args: {
  plan: Plan;
  planPath: string;
  isRootPlanner: boolean;
  slackAdapter?: SlackAdapter;
  logAttention: (line: string) => void;
}): Promise<void> {
  if (!args.isRootPlanner) return;
  if (args.plan.slackKickoffRef) return;
  if (!args.slackAdapter) return;
  try {
    args.plan.slackKickoffRef = await args.slackAdapter.postRunKickoff({
      text: formatKickoffText(args.plan),
      username: kickoffUsername(args.plan),
    });
    // Atomic write so a crash mid-flush can't leave a truncated plan.json
    // that fails strict zod parsing on restart.
    writePlanAtomic(args.planPath, args.plan);
  } catch (err) {
    args.logAttention(
      `slack kickoff failed: ${truncate(errorMessage(err), 200)}`
    );
  }
}

function writePlanAtomic(planPath: string, plan: Plan): void {
  const tmp = `${planPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(plan, null, 2));
  renameSync(tmp, planPath);
}

function planIsRootPlanner(plan: Plan): boolean {
  return !plan.andonStateRef && !plan.andonStatePath;
}

const KICKOFF_GOAL_FALLBACK_CHARS = 200;

/**
 * Kickoff body: `<rootSlug>: <orientation> <footer>`. Orientation is
 * `plan.summary` when set, otherwise the first line of `plan.goal` truncated
 * to ~200 chars. Footer links back to the root planner's cursor.com page
 * when `plan.selfAgentId` is set.
 */
export function formatKickoffText(plan: Plan): string {
  const orientation =
    plan.summary?.trim() ||
    truncateForKickoff(plan.goal, KICKOFF_GOAL_FALLBACK_CHARS);
  const head = `\`${plan.rootSlug}\`: ${orientation}`;
  const footer = formatAgentFooter(plan.selfAgentId);
  return footer ? `${head} ${footer}` : head;
}

export function kickoffUsername(plan: Plan): string {
  const firstName = plan.dispatcher?.firstName?.trim();
  return firstName ? `${firstName}'s bot` : "orchestrate";
}

function truncateForKickoff(goal: string, max: number): string {
  const firstLine = goal.split("\n")[0]?.trim() ?? "";
  if (firstLine.length <= max) return firstLine;
  return `${firstLine.slice(0, max).trimEnd()}…`;
}

/**
 * Slack mrkdwn footer pointing at the posting agent's cursor.com page.
 * Returns "" when the agent id is unknown (operator CLI calls without
 * `--agent-id`, or pre-selfAgentId plans). Callers append it directly.
 *
 * The label is plain ASCII on purpose. Slack's mrkdwn parser rewrites
 * unicode arrows like ↗ to `:arrow_upper_right:` shortcodes and renders
 * them as standalone emoji blocks, dropping the URL on the floor.
 */
export function formatAgentFooter(agentId: string | null | undefined): string {
  const id = agentId?.trim();
  if (!id) return "";
  return `<https://cursor.com/agents/${id}|view>`;
}

export function appendAgentFooter(
  body: string,
  agentId: string | null | undefined
): string {
  const footer = formatAgentFooter(agentId);
  return footer ? `${body}\n${footer}` : body;
}

function appendSlackView(detail: string, view: string): string {
  if (detail && view) return `${detail} · ${view}`;
  return detail || view;
}

function failureModeText(mode: TaskState["failureMode"]): string {
  const normalized = mode ?? "unknown";
  switch (normalized) {
    case "cap-hit":
      return "hit the 75min cap";
    case "oom":
      return "ran out of memory";
    case "tool-error":
      return "tool error";
    case "network-drop":
      return "network error";
    case "unknown":
      return "unknown error";
    default: {
      const _exhaustive: never = normalized;
      return _exhaustive;
    }
  }
}

function formatElapsedMinutes(startedAt: string | null): string {
  if (!startedAt) return "0m";
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return "0m";
  return formatDurationMinutes(Date.now() - started);
}

function formatDurationMinutes(ms: number): string {
  return `${Math.max(0, Math.floor(ms / 60_000))}m`;
}

function parseIdleWarningMs(message: string): number | null {
  const match = /\b(?:SSE|tool_call) idle (\d+)ms\b/.exec(message);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatGitShortstat(shortstat: string): string | null {
  const trimmed = shortstat.trim();
  if (!trimmed) return null;
  const files = /(\d+ files? changed)/.exec(trimmed)?.[1];
  if (!files) return null;
  const insertions = /(\d+) insertions?\(\+\)/.exec(trimmed)?.[1] ?? "0";
  const deletions = /(\d+) deletions?\(-\)/.exec(trimmed)?.[1] ?? "0";
  return `${files} (+${insertions}/-${deletions})`;
}

function githubRepoFromRemote(
  remote: string
): { owner: string; repo: string } | null {
  const url = gitRemoteToUrl(remote);
  if (!url) return null;
  if (url.hostname !== "github.com") return null;
  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) return null;
  const repo = rawRepo.endsWith(".git") ? rawRepo.slice(0, -4) : rawRepo;
  return { owner, repo };
}

function gitRemoteToUrl(remote: string): URL | null {
  const trimmed = remote.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (trimmed.startsWith("git@")) {
    const withoutUser = trimmed.slice("git@".length);
    const separator = withoutUser.indexOf(":");
    if (separator < 0) return null;
    candidate = `ssh://git@${withoutUser.slice(0, separator)}/${withoutUser.slice(separator + 1)}`;
  }
  try {
    return new URL(candidate);
  } catch {
    try {
      return new URL(`https://${candidate}`);
    } catch {
      return null;
    }
  }
}

/**
 * Race `run.wait()` against a periodic Agent.getRun poll so a wedged SSE
 * can't hang the reconcile loop forever. Polling wins when the SSE stays
 * silent while the server has already moved the run to terminal.
 *
 * Losing `run.wait()` stays pending on its dead stream until process exit;
 * cloud-agent dispose is a no-op, so the leak is acceptable.
 */
async function waitRunWithWatchdog(args: {
  run: Run;
  agentId: string;
  runId: string;
  apiKey: string;
  lastSseActivityAt: { value: number };
  lastToolCallAt: { value: number | null };
  logAttention: (line: string) => void;
  taskLabel: string;
}): Promise<RunResult> {
  const ac = new AbortController();
  let idleEpisodeLogged = false;
  let toolCallIdleEpisodeLogged = false;
  const waitStartedAt = Date.now();

  const pollLoop = async (): Promise<RunResult> => {
    while (!ac.signal.aborted) {
      try {
        await sleep(WAIT_WATCHDOG_POLL_INTERVAL_MS, undefined, {
          signal: ac.signal,
        });
      } catch {
        return Promise.reject(new Error("watchdog aborted"));
      }
      if (ac.signal.aborted) break;
      let probe: Run;
      try {
        probe = await Agent.getRun(args.runId, {
          runtime: "cloud",
          apiKey: args.apiKey,
          agentId: args.agentId,
        });
      } catch {
        continue;
      }
      if (probe.status !== "running") {
        return probe.wait();
      }
      const idleMs = Date.now() - args.lastSseActivityAt.value;
      if (idleMs >= WAIT_SSE_IDLE_ATTENTION_MS && !idleEpisodeLogged) {
        idleEpisodeLogged = true;
        args.logAttention(
          `${args.taskLabel}: SSE idle ${idleMs}ms, polled status=running; watchdog still waiting`
        );
      }
      const toolCallIdleMs =
        Date.now() - (args.lastToolCallAt.value ?? waitStartedAt);
      if (
        toolCallIdleMs >= toolCallIdleThresholdMs() &&
        !toolCallIdleEpisodeLogged
      ) {
        toolCallIdleEpisodeLogged = true;
        args.logAttention(
          formatToolCallIdleWarning({
            taskLabel: args.taskLabel,
            idleMs: toolCallIdleMs,
            lastToolCallAt: args.lastToolCallAt.value,
            waitStartedAt,
          })
        );
      }
    }
    return Promise.reject(new Error("watchdog aborted"));
  };

  const waitPromise = args.run.wait().finally(() => ac.abort());
  try {
    return await Promise.race([waitPromise, pollLoop()]);
  } finally {
    ac.abort();
  }
}

export async function inspectRunStream(args: {
  run: Run;
  task: string;
  agentId: string;
  runId: string;
  timeoutMs: number;
}): Promise<RunInspection> {
  const startedAt = Date.now();
  const streamedMessages: string[] = [];
  let assistantText = "";
  let toolCallsTotal = 0;
  const toolCallTimestamps: number[] = [];
  let lastToolCall: ToolCallInspection | null = null;

  const iterator = args.run.stream()[Symbol.asyncIterator]();
  try {
    while (Date.now() - startedAt < args.timeoutMs) {
      const remaining = Math.max(0, args.timeoutMs - (Date.now() - startedAt));
      const next = await Promise.race([
        iterator.next(),
        sleep(remaining).then(() => ({
          done: true as const,
          value: undefined,
        })),
      ]);
      if (next.done) break;
      const event = next.value;
      if (event.type === "assistant") {
        let text = "";
        for (const block of event.message.content) {
          if (block.type === "text" && typeof block.text === "string") {
            text += block.text;
          }
        }
        if (text.length > 0) {
          assistantText += text;
          const last = streamedMessages.at(-1);
          if (last === undefined) streamedMessages.push(text);
          else streamedMessages[streamedMessages.length - 1] = last + text;
        }
        continue;
      }
      if (event.type === "tool_call") {
        const ts = Date.now();
        toolCallsTotal++;
        toolCallTimestamps.push(ts);
        lastToolCall = summarizeToolCall(event);
      }
    }
  } finally {
    await Promise.race([iterator.return?.(), sleep(1_000)]);
  }
  const toolCallWindowStart = Date.now() - 5 * 60_000;

  return {
    task: args.task,
    agentId: args.agentId,
    runId: args.runId,
    drainedMs: Date.now() - startedAt,
    streamed_messages: streamedMessages,
    tool_calls_total: toolCallsTotal,
    tool_calls_last_5min: toolCallTimestamps.filter(
      ts => ts >= toolCallWindowStart
    ).length,
    last_assistant_text_snippet: assistantText.slice(-500),
    last_tool_call: lastToolCall,
  };
}

export function formatToolCallIdleWarning(args: {
  taskLabel: string;
  idleMs: number;
  lastToolCallAt: number | null;
  waitStartedAt: number;
}): string {
  const lastCall = args.lastToolCallAt
    ? new Date(args.lastToolCallAt).toISOString()
    : `none since wait start (${new Date(args.waitStartedAt).toISOString()})`;
  return `${args.taskLabel}: tool_call idle ${args.idleMs}ms; last=${lastCall}`;
}

function toolCallIdleThresholdMs(): number {
  const raw = process.env.ORCHESTRATE_TOOL_CALL_IDLE_MS;
  if (!raw) return WAIT_TOOL_CALL_IDLE_ATTENTION_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : WAIT_TOOL_CALL_IDLE_ATTENTION_MS;
}

function summarizeToolCall(event: unknown): ToolCallInspection {
  const payload =
    typeof event === "object" && event !== null
      ? (event as Record<string, unknown>)
      : {};
  const full = JSON.stringify(redactToolCallPayload(payload));
  const snippet = truncate(full, 1_000);
  return {
    type: "tool_call",
    name: stringField(payload.name),
    status: stringField(payload.status),
    call_id: stringField(payload.call_id),
    payload_keys: Object.keys(payload).sort(),
    payload_snippet: snippet,
    truncated: snippet !== full,
  };
}

function redactToolCallPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/token|secret|password|api[_-]?key|authorization/i.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (key === "args" || key === "result") {
      out[key] = summarizePayloadValue(redactDeep(value));
      continue;
    }
    out[key] = redactDeep(value);
  }
  return out;
}

function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDeep);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = /token|secret|password|api[_-]?key|authorization/i.test(key)
      ? "[redacted]"
      : redactDeep(nested);
  }
  return out;
}

function summarizePayloadValue(value: unknown): unknown {
  const raw = JSON.stringify(value) ?? String(value);
  if (raw.length <= 500) return value;
  return {
    truncated: true,
    chars: raw.length,
    snippet: raw.slice(0, 500),
  };
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// The SDK has used both `error` and `errorMessage` over its lifetime
// and sometimes passes the reason through `result`. Pull whichever is
// populated so the failure classifier gets real signal.
function runResultErrorMessage(rr: RunResult): string | null {
  const record = rr as unknown as Record<string, unknown>;
  for (const key of ["error", "errorMessage"] as const) {
    const val = record[key];
    if (typeof val === "string" && val.trim().length > 0) return val;
    if (val instanceof Error && val.message.trim().length > 0)
      return val.message;
  }
  if (rr.status === "error" && typeof rr.result === "string") {
    const trimmed = rr.result.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

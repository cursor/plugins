import { setTimeout as sleep } from "node:timers/promises";

import type { Plan, PlanTask, TaskState } from "../schemas.ts";
import type { AgentManager } from "./agent-manager.ts";
import { isAndonActive } from "./andon.ts";
import { drainCommentRetryQueue } from "./comment-retry-queue.ts";

const SPAWN_SWEEP_INTERVAL_MS = 10_000;
export const PLANNED_CHECKPOINT_EXIT_CODE = 100;
export const EXIT_ON_ERROR_EXIT_CODE = 1;
export const DEFAULT_MAX_RUNTIME_SEC = 3_600;

export interface RunLoopOptions {
  maxRuntimeSec?: number;
  rootMode?: boolean;
  // Return on the first new terminal-error this run. Default true;
  // `--exit-on-all-done` opts into the old drain-to-quiescence behavior.
  exitOnError?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Drive the workspace to completion: recover running tasks, spawn ready
 * pending tasks, wait for handoffs, repeat until no progress is possible.
 * Returns the CLI exit code.
 *
 * Idempotent: when an upstream errors, downstream tasks stay `pending`
 * rather than being auto-pruned. Fixing the upstream and re-running is the
 * recovery path; use `kill` explicitly if you want to converge a broken tree.
 */
export async function runOrchestrateLoop(
  mgr: AgentManager,
  options: RunLoopOptions = {}
): Promise<number> {
  const running: Promise<void>[] = [];
  const maxRuntimeSec = options.maxRuntimeSec ?? DEFAULT_MAX_RUNTIME_SEC;
  const rootMode = options.rootMode ?? false;
  const exitOnError = options.exitOnError ?? true;
  const now = options.now ?? Date.now;
  const sleepFn = options.sleep ?? sleep;
  const startedAt = now();
  // Pre-existing errors (respawned-but-still-failed, pruned-siblings)
  // must not short-circuit the first sweep; only new transitions do.
  const preExistingErrors = new Set(
    mgr.tasks.filter(s => s.status === "error").map(s => s.name)
  );

  for (const s of mgr.tasks) {
    if (s.status === "running") {
      const rec = await mgr.recoverRunning(s);
      if (rec) running.push(mgr.waitAndHandoff(rec));
    }
  }

  if (exitOnError && hasNewTerminalError(mgr, preExistingErrors)) {
    return exitOnErrorReturn(mgr, preExistingErrors);
  }

  while (true) {
    await spawnReadyPending(mgr, running);
    printSweepHeartbeat(mgr);
    if (exitOnError && hasNewTerminalError(mgr, preExistingErrors)) {
      return exitOnErrorReturn(mgr, preExistingErrors);
    }
    const progressPossible = canMakeProgress(mgr);
    const elapsedMs = now() - startedAt;
    if (progressPossible && elapsedMs >= maxRuntimeSec * 1000) {
      const elapsedSec = Math.floor(elapsedMs / 1000);
      return plannedCheckpointRestart(mgr, elapsedSec, rootMode);
    }
    if (!progressPossible) break;
    const remainingRuntimeMs = maxRuntimeSec * 1000 - elapsedMs;
    await sleepFn(
      Math.min(SPAWN_SWEEP_INTERVAL_MS, Math.max(1, remainingRuntimeMs))
    );
  }
  await Promise.allSettled(running);

  flagUnreachablePending(mgr);
  printLoopSummary(mgr);
  return computeLoopExitCode(mgr);
}

function plannedCheckpointRestart(
  mgr: AgentManager,
  elapsedSec: number,
  rootMode: boolean
): number {
  const pending = mgr.tasks.filter(s => s.status === "pending").length;
  const running = mgr.tasks.filter(s => s.status === "running").length;
  mgr.syncStateToGit("planned checkpoint restart");
  const rootFlag = rootMode ? "--root " : "";
  console.error(
    `[orchestrate] planned checkpoint restart at ${elapsedSec}s; non-terminal tasks remain (pending=${pending}, running=${running}); re-invoke 'bun cli.ts run ${rootFlag}${mgr.workspace}' to resume.`
  );
  return PLANNED_CHECKPOINT_EXIT_CODE;
}

function hasNewTerminalError(
  mgr: AgentManager,
  preExistingErrors: Set<string>
): boolean {
  return mgr.tasks.some(
    s => s.status === "error" && !preExistingErrors.has(s.name)
  );
}

function exitOnErrorReturn(
  mgr: AgentManager,
  preExistingErrors: Set<string>
): number {
  const newErrors = mgr.tasks
    .filter(s => s.status === "error" && !preExistingErrors.has(s.name))
    .map(s => s.name);
  mgr.syncStateToGit(`exit-on-error: ${newErrors.join(", ")}`);
  console.error(
    `[orchestrate] exit-on-error: ${newErrors.length} task(s) transitioned to error this run (${newErrors.join(", ")}); planner's turn. See handoffs/<task>-failure.md for each. Re-run 'bun cli.ts run' after reacting (in-flight workers reattach via recoverRunning).`
  );
  return EXIT_ON_ERROR_EXIT_CODE;
}

async function spawnReadyPending(
  mgr: AgentManager,
  running: Promise<void>[]
): Promise<void> {
  await drainCommentRetryQueue({
    workspace: mgr.workspace,
    destinations: mgr.commentDestinations(),
    logAttention: line => mgr.logAttention(line),
    allowedSlackThread: mgr.plan.slackKickoffRef
      ? {
          channel: mgr.plan.slackKickoffRef.channel,
          threadTs: mgr.plan.slackKickoffRef.ts,
        }
      : undefined,
  });
  await mgr.andon.drainEvents();
  if (mgr.andon.isActive()) {
    mgr.andon.noteSpawnPaused();
    return;
  }
  for (const def of planTasks(mgr.plan)) {
    const s = mgr.getTask(def.name);
    if (!s || s.status !== "pending") continue;
    if (!mgr.depsSatisfied(s)) continue;
    const spawned = await mgr.spawnTask(def);
    if (spawned) running.push(mgr.waitAndHandoff(spawned));
  }
}

/**
 * Progress is possible iff some task is running OR at least one pending task
 * could still have its deps satisfied (deps are all non-terminal or
 * already handed-off).
 */
function canMakeProgress(mgr: AgentManager): boolean {
  return mgr.tasks.some(
    s =>
      s.status === "running" ||
      (s.status === "pending" && pendingCouldStillSpawn(mgr, s))
  );
}

function pendingCouldStillSpawn(mgr: AgentManager, task: TaskState): boolean {
  // Ad-hoc tasks (not in plan.tasks) are never spawned by the reconcile
  // loop; operator must re-run `cli.ts spawn` or `kill` them. Treating
  // them as "still schedulable" here would hang the loop indefinitely.
  if (!planTasks(mgr.plan).some(t => t.name === task.name)) return false;
  const memo = new Map<string, boolean>();
  const visit = (s: TaskState, path: Set<string>): boolean => {
    const cached = memo.get(s.name);
    if (cached !== undefined) return cached;
    if (path.has(s.name)) {
      memo.set(s.name, false);
      return false;
    }

    const nextPath = new Set(path);
    nextPath.add(s.name);
    // Pending chains can hide terminal blockers behind direct pending deps.
    for (const dep of s.dependsOn) {
      const ds = mgr.getTask(dep);
      if (!ds || isFailedTerminalStatus(ds.status)) {
        memo.set(s.name, false);
        return false;
      }
      if (ds.status !== "handed-off" && !visit(ds, nextPath)) {
        memo.set(s.name, false);
        return false;
      }
    }
    memo.set(s.name, true);
    return true;
  };
  return visit(task, new Set());
}

/**
 * After the loop exits, any remaining pending task with a terminal-failed
 * dep stays pending (not pruned). Record an attention entry per blocked
 * task so the operator sees the blast radius and can choose: fix the
 * upstream and rerun, or `kill` them explicitly.
 */
function flagUnreachablePending(mgr: AgentManager): void {
  for (const s of mgr.tasks) {
    if (s.status !== "pending") continue;
    const blockers: string[] = [];
    for (const dep of s.dependsOn) {
      const ds = mgr.getTask(dep);
      if (!ds) blockers.push(`${dep} (missing)`);
      else if (isFailedTerminalStatus(ds.status)) {
        blockers.push(`${dep} (${ds.status})`);
      }
    }
    if (blockers.length > 0) {
      mgr.logAttention(
        `${s.name}: unreachable — blocked on ${blockers.join(", ")}. Fix the upstream and rerun, or \`kill ${s.name}\` to abandon.`
      );
    }
  }
}

function computeLoopExitCode(mgr: AgentManager): number {
  const anyError = mgr.tasks.some(s => s.status === "error");
  const anyCancelled = mgr.tasks.some(s => s.status === "cancelled");
  const anyPending = mgr.tasks.some(s => s.status === "pending");
  if (anyError || anyCancelled || anyPending) return 1;
  return 0;
}

function isFailedTerminalStatus(status: TaskState["status"]): boolean {
  return status === "error" || status === "cancelled" || status === "pruned";
}

/**
 * One-line liveness signal per sweep. Distinguishes "still reconciling" from
 * "dead" for anyone tailing stdout or polling with `AwaitShell`.
 */
function printSweepHeartbeat(mgr: AgentManager): void {
  const counts = mgr.tasks.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  const order = [
    "pending",
    "running",
    "handed-off",
    "error",
    "cancelled",
    "pruned",
  ];
  const parts = order
    .filter(status => (counts[status] ?? 0) > 0)
    .map(status => `${status}=${counts[status]}`);
  const andon = isAndonActive(mgr.state.andon) ? " ANDON" : "";
  console.log(
    `[${new Date().toISOString()}] sweep ${mgr.plan.rootSlug}: ${parts.join(" ") || "(no tasks)"}${andon}`
  );
}

function printLoopSummary(mgr: AgentManager): void {
  const counts = mgr.tasks.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("");
  if (isAndonActive(mgr.state.andon)) {
    console.log(
      `>> ANDON ACTIVE - raised at ${mgr.state.andon.raisedAt} by ${mgr.state.andon.raisedBy ?? "unknown"}: ${truncate(mgr.state.andon.reason ?? "", 100)}`
    );
  } else if (mgr.andon.clearedDuringLoop && mgr.state.andon?.clearedAt) {
    console.log(
      `Andon cleared at ${mgr.state.andon.clearedAt} by ${mgr.state.andon.clearedBy ?? "unknown"}`
    );
  }
  console.log(`orchestrate summary (${mgr.plan.rootSlug}):`);
  for (const [status, n] of Object.entries(counts).sort()) {
    console.log(`  ${status}: ${n}`);
  }
  const handed = mgr.tasks.filter(s => s.status === "handed-off");
  if (handed.length > 0) {
    console.log(`  handoffs written to: ${mgr.handoffsDir}`);
    for (const s of handed) console.log(`    - ${s.handoffPath}`);
  }
  if (mgr.state.attention.length > 0) {
    console.log(
      `  attention entries: ${mgr.state.attention.length} (see ${mgr.attentionLog})`
    );
  }
}

function planTasks(plan: Plan): PlanTask[] {
  return plan.tasks ?? [];
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

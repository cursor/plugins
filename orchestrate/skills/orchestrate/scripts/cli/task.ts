import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { CursorAgentError as CursorAgentErrorValue } from "@cursor/sdk";
import type { Command } from "commander";
import { createSlackAdapter } from "../adapters/index.ts";
import { DEFAULT_MAX_RUNTIME_SEC, runOrchestrateLoop } from "../core/loop.ts";
import { resolveModelSelection } from "../models.ts";
import {
  parsePlanTaskJson,
  parsePlanTaskValue,
  type StopResult,
  type TaskState,
} from "../schemas.ts";
import {
  buildInlineTask,
  buildKickoffAgentName,
  buildKickoffPrompt,
  collect,
  collectCascadeVictims,
  errorMessage,
  loadOrBail,
  parsePositiveIntegerOrBail,
  parseRespawnSourceOrBail,
  resolveKickoffSlackChannelOrBail,
  resolveKickoffRepoUrl,
  resolveWorkspaceSlackChannelOrBail,
  type SpawnOptions,
  transitivelyDependsOn,
} from "./util.ts";

export const MAX_BOOT_MS = 30 * 60 * 1000;
const ACTIVE_ROOT_RUN_STATUSES = new Set(["pending", "running"]);

type AgentListApi = {
  list: (opts: { runtime: "cloud"; limit: number }) => Promise<unknown>;
  listRuns?: (
    agentId: string,
    opts: { runtime: "cloud"; limit: number }
  ) => Promise<unknown>;
};

export type ActiveRootPlanner = {
  agentId: string;
  runId: string | null;
  status: string;
  name: string;
};

export function registerTaskCommands(program: Command): void {
  program
    .command("run")
    .argument(
      "<workspace>",
      "Path to the orchestrate workspace (contains plan.json)"
    )
    .option(
      "--root",
      "Mark this as the root workspace for the operator-facing re-run hint."
    )
    .option(
      "--slack-channel <id>",
      "Slack channel id for the root run. Falls back to SLACK_CHANNEL_ID."
    )
    .option(
      "--max-runtime-sec <number>",
      "Exit with code 100 after this many seconds when non-terminal work remains.",
      String(DEFAULT_MAX_RUNTIME_SEC)
    )
    .option(
      "--exit-on-all-done",
      "Keep draining to quiescence instead of returning on the first terminal error. Default is exit-on-error so the planner reacts to failures promptly (in-flight workers reattach on the next run)."
    )
    .description(
      "Run the reconcile loop: spawn pending tasks (respecting dependsOn), wait for handoffs, write them to <workspace>/handoffs/, repeat until terminal. Idempotent — rerun to pick up plan.json changes or retries."
    )
    .action(
      async (
        workspace: string,
        opts: {
          root?: boolean;
          slackChannel?: string;
          maxRuntimeSec: string;
          exitOnAllDone?: boolean;
        }
      ) => {
        const maxRuntimeSec = parsePositiveIntegerOrBail({
          value: opts.maxRuntimeSec,
          flag: "--max-runtime-sec",
        });
        const slackChannel = opts.root
          ? resolveWorkspaceSlackChannelOrBail({
              workspace,
              explicit: opts.slackChannel,
            })
          : undefined;
        const mgr = await loadOrBail(workspace, { slackChannel });
        const code = await runOrchestrateLoop(mgr, {
          maxRuntimeSec,
          rootMode: opts.root,
          exitOnError: !opts.exitOnAllDone,
        });
        process.exit(code);
      }
    );

  program
    .command("kickoff")
    .argument("<goal>", "Root orchestration goal")
    .option("--repo <url>", "Repository URL to orchestrate")
    .option("--ref <ref>", "Starting git ref for the cloud workspace", "main")
    .option("--model <id>", "Model id for the root planner", "claude-opus-4-7")
    .option("--force", "Spawn a new root planner even when a recent matching run exists.")
    .option(
      "--slack-channel <id>",
      "Slack channel id for run visibility. Falls back to SLACK_CHANNEL_ID."
    )
    .option(
      "--dispatcher-name <name>",
      "First name for the kickoff bot username (`<name>'s bot`). Falls back to Slack lookup by `git config user.email`, then to `orchestrate`."
    )
    .description(
      "Spawn a cloud root planner for an orchestrate goal, then print the agent/run identifiers."
    )
    .action(
      async (
        goal: string,
        opts: {
          repo?: string;
          ref: string;
          model: string;
          force?: boolean;
          slackChannel?: string;
          dispatcherName?: string;
        }
      ) => {
        const apiKey = process.env.CURSOR_API_KEY;
        if (!apiKey) {
          console.error("CURSOR_API_KEY not set");
          process.exit(2);
        }
        let CursorAgentErrorCtor: typeof CursorAgentErrorValue | null = null;
        try {
          const slackChannel = resolveKickoffSlackChannelOrBail(
            opts.slackChannel
          );
          const sdk = await import("@cursor/sdk");
          CursorAgentErrorCtor = sdk.CursorAgentError;
          const url = resolveKickoffRepoUrl(opts.repo);
          const rootSlug = inferKickoffRootSlug(goal);
          if (!opts.force) {
            const active = await findActiveRootPlanner(sdk.Agent, rootSlug);
            if (active) {
              console.log(`adopting ${active.agentId}`);
              console.log(
                JSON.stringify({
                  agentId: active.agentId,
                  runId: active.runId,
                  status: active.status,
                  url: `https://cursor.com/agents/${active.agentId}`,
                  adopted: true,
                })
              );
              process.exit(0);
            }
          }
          const dispatcherFirstName = await resolveDispatcherFirstName(
            opts.dispatcherName,
            slackChannel
          );
          const agent = await sdk.Agent.create({
            apiKey,
            name: `${rootSlug}-root`,
            cloud: {
              repos: [{ url, startingRef: opts.ref }],
              autoCreatePR: false,
            },
            model: resolveModelSelection(opts.model),
          });
          const prompt = buildKickoffPrompt({
            goal,
            agentId: agent.agentId,
            dispatcherFirstName,
            slackChannel,
          });
          const run = await agent.send({ text: prompt });
          console.log(
            JSON.stringify({
              agentId: agent.agentId,
              runId: run.id,
              status: run.status,
              url: `https://cursor.com/agents/${agent.agentId}`,
              dispatcherFirstName: dispatcherFirstName ?? null,
            })
          );
          // agent.send opens an SSE stream that keeps the event loop alive;
          // explicit exit so the dispatcher CLI returns instead of hanging.
          process.exit(0);
        } catch (err) {
          if (CursorAgentErrorCtor && err instanceof CursorAgentErrorCtor) {
            console.error(err.message);
            process.exit(2);
          }
          console.error(
            err instanceof Error ? (err.stack ?? err.message) : String(err)
          );
          process.exit(1);
        }
      }
    );

  program
    .command("spawn")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .description(
      "Ad-hoc spawn a tracked task that wasn't in plan.json. The task is added to state.json with adHoc=true, spawned as a cloud agent, and handoff-collected either immediately (--wait) or via a later `run` invocation."
    )
    .option(
      "--file <path>",
      "Path to a JSON file with the PlanTask definition (name/type/scopedGoal/...)"
    )
    .option("--name <name>", "Task name (kebab-case)")
    .option("--type <type>", "worker | subplanner")
    .option(
      "--goal <text>",
      "scopedGoal text (prefer --file for anything non-trivial)"
    )
    .option(
      "--paths-allowed <glob>",
      "Allowed path glob; repeat for multiple",
      collect,
      [] satisfies string[]
    )
    .option(
      "--paths-forbidden <glob>",
      "Forbidden path glob; repeat for multiple",
      collect,
      [] satisfies string[]
    )
    .option(
      "--acceptance <line>",
      "Acceptance criterion; repeat for multiple",
      collect,
      [] satisfies string[]
    )
    .option("--starting-ref <branch>", "startingRef override")
    .option(
      "--depends-on <name>",
      "Dep task name; repeat for multiple",
      collect,
      [] satisfies string[]
    )
    .option("--model <id>", "Model id override (default composer-2)")
    .option(
      "--wait",
      "Block until the spawned task hands off (default: exit right after spawn)"
    )
    .action(async (workspace: string, opts: SpawnOptions) => {
      const mgr = await loadOrBail(workspace);
      const def = opts.file
        ? parsePlanTaskJson(readFileSync(opts.file, "utf8"), opts.file)
        : parsePlanTaskValue(buildInlineTask(opts), "spawn options");
      if (def.type === "verifier") {
        console.error(
          `invalid task.type: ad-hoc spawn supports "worker" or "subplanner", got ${JSON.stringify(def.type)}`
        );
        process.exit(1);
      }
      const existing = mgr.getTask(def.name);
      if (existing && existing.status !== "pending") {
        console.error(
          `task "${def.name}" already exists with status=${existing.status}. Pick a different name or prune first.`
        );
        process.exit(1);
      }
      console.error(`spawning ${def.name} (${def.type}) ...`);
      const spawned = await mgr.spawnTask(def, { adHoc: true });
      if (!spawned) {
        console.error(`spawn failed; see ${mgr.attentionLog}`);
        process.exit(1);
      }
      console.error(`  agent=${spawned.agent.agentId} run=${spawned.run.id}`);
      if (opts.wait) {
        console.error(`  waiting for handoff ...`);
        await mgr.waitAndHandoff(spawned);
        const body = mgr.readHandoff(def.name);
        if (body) process.stdout.write(body);
      } else {
        console.error(`  tail: bun cli.ts tail ${workspace} ${def.name}`);
      }
    });

  program
    .command("respawn")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .argument("<task>", "Task name to reset to pending")
    .option(
      "--cascade",
      "Also reset any downstream tasks that were cascade-pruned when this one failed"
    )
    .option(
      "--source <source>",
      "Who initiated the respawn: local-cli | self-planner | script-auto-retry",
      "local-cli"
    )
    .description(
      "Put a terminal task (`error` or `pruned`) back to `pending` for the next `run`. Bump is recorded via `attempts` on spawn. `--source` labels who initiated the reset."
    )
    .action(
      async (
        workspace: string,
        task: string,
        opts: { cascade?: boolean; source: string }
      ) => {
        const mgr = await loadOrBail(workspace);
        try {
          const source = parseRespawnSourceOrBail(opts.source);
          const s = mgr.respawnTask(task, { source });
          console.log(`respawned ${task} (prev attempts=${s.attempts ?? 0})`);
          if (opts.cascade) {
            const toReset = mgr.tasks.filter(
              t =>
                t.status === "pruned" &&
                transitivelyDependsOn(mgr.tasks, {
                  task: t.name,
                  ancestor: task,
                })
            );
            for (const t of toReset) {
              mgr.respawnTask(t.name, { source });
              console.log(`  + cascaded: ${t.name}`);
            }
            if (toReset.length === 0)
              console.log("  (no cascade candidates found)");
          }
          console.log(`next: bun cli.ts run ${workspace}`);
        } catch (err) {
          console.error(`respawn failed: ${errorMessage(err)}`);
          process.exit(1);
        }
      }
    );

  program
    .command("cancel")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .argument("<task>", "Task name to cancel")
    .description(
      'Cancel a single running task via the SDK. Marks the task status=error with note "cancelled by operator". For bulk/tree stops, use `kill` instead.'
    )
    .action(async (workspace: string, task: string) => {
      const mgr = await loadOrBail(workspace);
      try {
        await mgr.cancel(task);
        console.log(`cancelled ${task}`);
      } catch (err) {
        console.error(`cancel failed: ${errorMessage(err)}`);
        process.exit(1);
      }
    });

  program
    .command("kill")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .argument("[task]", "Task name to kill; omit to kill the whole workspace")
    .option(
      "--no-cascade",
      "When killing a single task, leave its dependents `pending` instead of pruning them (default: cascade)"
    )
    .option("-y, --yes", "Skip the confirmation prompt")
    .description(
      "Stop tasks in bulk: cancel running ones (via SDK) and prune pending ones (won't spawn). With no task argument, kills every non-terminal task in the workspace. With a task argument, cascade-prunes dependents by default. Useful for tearing down a misbehaving orchestrate tree."
    )
    .action(
      async (
        workspace: string,
        task: string | undefined,
        opts: { cascade?: boolean; yes?: boolean }
      ) => {
        const mgr = await loadOrBail(workspace);

        const victims: TaskState[] = task
          ? opts.cascade === false
            ? [mgr.getTask(task)].filter((t): t is TaskState => t != null)
            : collectCascadeVictims(mgr, task)
          : mgr.tasks.filter(
              t => t.status === "pending" || t.status === "running"
            );

        if (victims.length === 0) {
          console.log("nothing to kill");
          return;
        }

        console.error(`about to stop ${victims.length} task(s):`);
        for (const v of victims)
          console.error(`  ${v.name.padEnd(32)} ${v.status}`);

        if (!opts.yes) {
          console.error("");
          console.error("re-run with -y to confirm.");
          process.exit(1);
        }

        let results: StopResult[];
        if (task) {
          results =
            opts.cascade === false
              ? [await mgr.stopTask(task)]
              : await mgr.stopTaskCascade(task);
        } else {
          results = await mgr.stopAll();
        }

        const cancelled = results.filter(r => r.action === "cancelled").length;
        const pruned = results.filter(r => r.action === "pruned").length;
        console.log(
          `stopped ${results.length} task(s): ${cancelled} cancelled, ${pruned} pruned`
        );
      }
    );

  program
    .command("tail")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .argument("<task>", "Task name to stream")
    .option(
      "--only-text",
      "Drop tool_call/status chrome; show only assistant text + thinking"
    )
    .description(
      "Stream SDK events (assistant/thinking/tool_call/status) from a running task. Exits when the stream ends."
    )
    .action(
      async (workspace: string, task: string, opts: { onlyText?: boolean }) => {
        const mgr = await loadOrBail(workspace);
        try {
          for await (const event of mgr.tail(task)) {
            switch (event.type) {
              case "assistant":
                for (const block of event.message.content) {
                  if (block.type === "text") process.stdout.write(block.text);
                  else if (!opts.onlyText)
                    process.stderr.write(`\n[tool ${block.name}]\n`);
                }
                break;
              case "thinking":
                process.stdout.write(event.text);
                break;
              case "tool_call":
                if (opts.onlyText) break;
                process.stderr.write(
                  `\n[tool_call ${event.name} ${event.status} ${event.call_id}]\n`
                );
                break;
              case "status":
                if (opts.onlyText) break;
                process.stderr.write(`\n[status ${event.status}]\n`);
                break;
              case "task":
                if (!opts.onlyText && event.text)
                  process.stderr.write(`\n[task ${event.text}]\n`);
                break;
              default:
                break;
            }
          }
        } catch (err) {
          console.error(`\ntail failed: ${errorMessage(err)}`);
          process.exit(1);
        }
      }
    );
}

export async function findActiveRootPlanner(
  agentApi: AgentListApi,
  rootSlug: string,
  nowMs: number = Date.now()
): Promise<ActiveRootPlanner | null> {
  const list = await agentApi.list({ runtime: "cloud", limit: 50 });
  for (const item of listItems(list)) {
    const name = stringField(item, "name");
    if (!name) continue;
    if (!name.startsWith(rootSlug)) continue;
    const createdAt = timeMs(field(item, "createdAt"));
    if (createdAt === null || nowMs - createdAt > MAX_BOOT_MS) continue;
    const agentId =
      stringField(item, "agentId") ?? stringField(item, "id") ?? null;
    if (!agentId) continue;
    const embeddedRun = latestRunFromItem(item);
    const run = embeddedRun ?? (await latestRunForAgent(agentApi, agentId));
    const status = runStatus(run);
    if (!ACTIVE_ROOT_RUN_STATUSES.has(status)) continue;
    return {
      agentId,
      runId: stringField(run, "id") ?? null,
      status,
      name,
    };
  }
  return null;
}

export function inferKickoffRootSlug(goal: string): string {
  const firstLine = goal.split("\n")[0]?.trim() ?? "";
  const explicit = firstLine.match(/^`?([a-z0-9][a-z0-9._-]*)`?\s*:/i);
  const slug = explicit?.[1];
  return slug ?? buildKickoffAgentName(goal);
}

function listItems(value: unknown): Record<string, unknown>[] {
  const items = Array.isArray(field(value, "items"))
    ? field(value, "items")
    : [];
  return (items as unknown[]).filter(isRecord);
}

async function latestRunForAgent(
  agentApi: AgentListApi,
  agentId: string
): Promise<Record<string, unknown> | null> {
  if (!agentApi.listRuns) return null;
  const runs = await agentApi.listRuns(agentId, { runtime: "cloud", limit: 1 });
  const items = field(runs, "items");
  const item = Array.isArray(items) ? items[0] : null;
  return isRecord(item) ? item : null;
}

function latestRunFromItem(
  item: Record<string, unknown>
): Record<string, unknown> | null {
  const candidates = [
    field(item, "latestRun"),
    field(item, "lastRun"),
    field(item, "run"),
  ];
  return candidates.find(isRecord) ?? null;
}

function runStatus(run: Record<string, unknown> | null): string {
  const raw =
    stringField(run, "status") ??
    stringField(run, "_status") ??
    stringField(run, "state") ??
    "";
  return raw.toLowerCase();
}

function timeMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringField(
  obj: Record<string, unknown> | null,
  key: string
): string | undefined {
  const value = obj?.[key];
  return typeof value === "string" ? value : undefined;
}

function field(obj: unknown, key: string): unknown {
  return isRecord(obj) ? obj[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Pick the dispatcher first name for the kickoff bot username. Order:
 * `--dispatcher-name`, then Slack `users.lookupByEmail` against
 * `git config user.email`, then undefined (kickoff falls back to
 * `orchestrate`). Best-effort: missing git config or Slack token is not
 * an error.
 */
export async function resolveDispatcherFirstName(
  override: string | undefined,
  slackChannel: string | undefined
): Promise<string | undefined> {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  const email = readGitUserEmail();
  if (!email) return undefined;
  if (!slackChannel) return undefined;
  const slack = createSlackAdapter(slackChannel);
  if (!slack) return undefined;
  return slack.lookupFirstNameByEmail(email);
}

function readGitUserEmail(): string | undefined {
  try {
    const email = execFileSync("git", ["config", "--get", "user.email"], {
      stdio: ["ignore", "pipe", "pipe"],
    })
      .toString()
      .trim();
    return email.length > 0 ? email : undefined;
  } catch {
    return undefined;
  }
}

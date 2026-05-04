import type { Command } from "commander";
import { isAndonActive } from "../core/andon.ts";
import { renderPrompt } from "../core/prompts.ts";
import { renderModelCatalog } from "../models.ts";
import type { TaskState } from "../schemas.ts";
import { firstChars, loadOrBail, parsePositiveIntegerOrBail } from "./util.ts";

export function registerInspectCommands(program: Command): void {
  program
    .command("inspect")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .argument("<task>", "Task name to inspect")
    .option("--timeout-sec <n>", "Stream drain timeout (seconds)", "30")
    .description(
      "Sample a running task's stream briefly; prints assistant deltas and tool-call counts."
    )
    .action(
      async (workspace: string, task: string, opts: { timeoutSec: string }) => {
        try {
          const mgr = await loadOrBail(workspace);
          const timeoutSec = parsePositiveIntegerOrBail({
            value: opts.timeoutSec,
            flag: "--timeout-sec",
          });
          const stateTask = mgr.getTask(task);
          if (!stateTask?.agentId || !stateTask.runId) {
            console.error(
              `inspect: ${task}: missing agentId/runId in state.json`
            );
            process.exit(1);
          }
          const inspection = await mgr.inspectTask(task, timeoutSec * 1000);
          console.log(JSON.stringify(inspection, null, 2));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`inspect failed: ${msg}`);
          process.exit(1);
        }
      }
    );

  program
    .command("tree")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .description(
      "Print an ascii tree of every tracked task under this workspace's rootSlug, with type/status/branch/agentId/attempts. Use this to see what's been spawned."
    )
    .action(async (workspace: string) => {
      const mgr = await loadOrBail(workspace);
      if (isAndonActive(mgr.state.andon)) {
        console.log(`>> ANDON ACTIVE (raised ${mgr.state.andon.raisedAt})`);
      }
      console.log(mgr.renderTree());
    });

  program
    .command("list")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .option(
      "--status <status>",
      "Filter by status (pending|running|handed-off|error|pruned)"
    )
    .option("--json", "Emit JSON instead of a table")
    .description(
      "Flat table of every tracked task: NAME / TYPE / STATUS / BRANCH / AGENT / RUN / ATTEMPTS. Optionally filter by --status."
    )
    .action(
      async (workspace: string, opts: { status?: string; json?: boolean }) => {
        const mgr = await loadOrBail(workspace);
        const rows = opts.status
          ? mgr.tasks.filter(t => t.status === opts.status)
          : mgr.tasks;
        if (opts.json) {
          console.log(JSON.stringify(rows, null, 2));
          return;
        }
        if (rows.length === 0) {
          console.log("(no tasks match)");
          return;
        }
        const cols: { header: string; get: (t: TaskState) => string }[] = [
          { header: "NAME", get: t => t.name },
          { header: "TYPE", get: t => t.type },
          { header: "STATUS", get: t => t.status },
          { header: "BRANCH", get: t => t.branch },
          { header: "AGENT", get: t => t.agentId ?? "" },
          { header: "RUN", get: t => t.runId ?? "" },
          { header: "ATTEMPTS", get: t => String(t.attempts ?? 0) },
        ];
        const widths = cols.map(c =>
          Math.max(c.header.length, ...rows.map(r => c.get(r).length))
        );
        const line = (cells: string[]) =>
          cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join("  ");
        console.log(line(cols.map(c => c.header)));
        for (const r of rows) console.log(line(cols.map(c => c.get(r))));
      }
    );

  program
    .command("status")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .description(
      "One-line summary of the workspace: counts by status + attention-log entry count. Useful for watch scripts."
    )
    .action(async (workspace: string) => {
      const mgr = await loadOrBail(workspace);
      const counts: Record<string, number> = {};
      for (const t of mgr.tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
      const parts = Object.entries(counts)
        .sort()
        .map(([k, v]) => `${v} ${k}`);
      const attn = mgr.state.attention.length;
      const attnSuffix = attn > 0 ? `, ${attn} attention` : "";
      console.log(
        `orchestrate[${mgr.plan.rootSlug}]: ${parts.join(", ")}${attnSuffix}`
      );
      if (mgr.state.andon) {
        if (isAndonActive(mgr.state.andon)) {
          console.log(
            `>> ANDON ACTIVE: raised at ${mgr.state.andon.raisedAt} by ${mgr.state.andon.raisedBy ?? "unknown"} - ${firstChars(mgr.state.andon.reason, 100)}`
          );
        } else if (mgr.state.andon.cleared) {
          console.log(
            `Andon last cleared at ${mgr.state.andon.clearedAt ?? "unknown"} by ${mgr.state.andon.clearedBy ?? "unknown"}`
          );
        }
      }
    });

  program
    .command("handoff")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .argument(
      "<task>",
      "Task name (kebab-case, matches plan.json / state.json)"
    )
    .description(
      "Print the collected handoff markdown for a completed task. Prints an error if the task hasn't handed off yet."
    )
    .action(async (workspace: string, task: string) => {
      const mgr = await loadOrBail(workspace);
      const body = mgr.readHandoff(task);
      if (body == null) {
        console.error(
          `no handoff yet for task "${task}" (status: ${mgr.getTask(task)?.status ?? "unknown"})`
        );
        process.exit(1);
      }
      process.stdout.write(body);
    });

  program
    .command("models")
    .option(
      "--check",
      "Validate each catalog entry against /v1/agents. Run after SDK or backend model-schema changes, or when kickoff/spawn returns invalid_model."
    )
    .description(
      "Print the model catalog. Planners consult this when setting `tasks[].model`."
    )
    .action(async (opts: { check?: boolean }) => {
      if (!opts.check) {
        console.log(renderModelCatalog());
        return;
      }
      const apiKey = process.env.CURSOR_API_KEY;
      if (!apiKey) {
        console.error("CURSOR_API_KEY not set");
        process.exit(2);
      }
      const { printProbeResults, probeModelCatalog } = await import(
        "../tools/probe-models.ts"
      );
      const results = await probeModelCatalog(apiKey);
      process.exit(printProbeResults(results) > 0 ? 1 : 0);
    });

  program
    .command("prompt")
    .argument("<workspace>", "Path to the orchestrate workspace")
    .argument("<task>", "Task name (kebab-case, matches plan.json)")
    .description(
      "Render the spawn prompt that a task will receive, without spawning. Includes upstream handoffs from any `dependsOn` tasks that have already handed off. Useful for previewing context or auditing prompt length."
    )
    .action(async (workspace: string, task: string) => {
      const mgr = await loadOrBail(workspace);
      try {
        process.stdout.write(
          renderPrompt({
            taskName: task,
            ctx: {
              plan: mgr.plan,
              branchForTask: t => mgr.branchForTask(t),
              getTask: name => mgr.getTask(name),
              readHandoff: name => mgr.readHandoff(name),
            },
          })
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(msg);
        process.exit(1);
      }
    });
}

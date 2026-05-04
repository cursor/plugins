import { execFileSync } from "node:child_process";
import type { Command } from "commander";
import { cancelCloudRun } from "../core/agent-manager.ts";
import {
  collectRunningAgentsInTree,
  crawlBranch,
  errorMessage,
  filterVictimsToSubtree,
} from "./util.ts";

export function registerForensicsCommands(program: Command): void {
  program
    .command("crawl")
    .argument(
      "<repo-path>",
      "Local path to a git clone of the orchestrated repo"
    )
    .argument(
      "<root-branch>",
      "Branch hosting the root planner's committed workspace"
    )
    .argument(
      "<root-slug>",
      "Root planner's rootSlug (workspace lives at .orchestrate/<root-slug>/)"
    )
    .option(
      "--no-fetch",
      "Skip `git fetch` (useful for offline tests or repeated calls)"
    )
    .description(
      "Recursively walk a running orchestrate tree across branches. Reads state.json for each planner from git (root planner + each subplanner on its own branch) and renders a deep, indented tree. Relies on the script's auto-commit of state.json on status transitions — older runs that predate that behavior won't show up."
    )
    .action(
      async (
        repoPath: string,
        rootBranch: string,
        rootSlug: string,
        opts: { fetch?: boolean }
      ) => {
        if (opts.fetch !== false) {
          try {
            execFileSync(
              "git",
              ["-C", repoPath, "fetch", "--quiet", "origin"],
              {
                stdio: "pipe",
              }
            );
          } catch (err) {
            console.error(`git fetch failed: ${errorMessage(err)}`);
            process.exit(2);
          }
        }
        const out: string[] = [];
        const visited = new Set<string>();
        crawlBranch(
          { repoPath, branch: rootBranch, slug: rootSlug },
          0,
          out,
          visited
        );
        console.log(out.join("\n"));
      }
    );

  program
    .command("kill-tree")
    .argument(
      "<repo-path>",
      "Local path to a git clone of the orchestrated repo"
    )
    .argument(
      "<root-branch>",
      "Branch hosting the root planner's committed workspace"
    )
    .argument("<root-slug>", "Root planner's rootSlug")
    .option("--no-fetch", "Skip `git fetch` before walking")
    .option("-y, --yes", "Skip the confirmation prompt")
    .option(
      "--agent-id <id>",
      "Only cancel agents under this id (follows parentAgentId links in state)"
    )
    .description(
      "Cancel every running cloud agent across an orchestrate tree. Walks state.json like `crawl`, collects `running` (agentId, runId) pairs, and cancels each via the SDK. With --agent-id, only that subtree. Needs CURSOR_API_KEY. Does not edit state.json; cancellations show up on the next reconcile."
    )
    .action(
      async (
        repoPath: string,
        rootBranch: string,
        rootSlug: string,
        opts: { fetch?: boolean; yes?: boolean; agentId?: string }
      ) => {
        const apiKey = process.env.CURSOR_API_KEY;
        if (!apiKey) {
          console.error(
            "CURSOR_API_KEY required; see cursor-sdk/references/auth.md"
          );
          process.exit(2);
        }
        if (opts.fetch !== false) {
          try {
            execFileSync(
              "git",
              ["-C", repoPath, "fetch", "--quiet", "origin"],
              {
                stdio: "pipe",
              }
            );
          } catch (err) {
            console.error(`git fetch failed: ${errorMessage(err)}`);
            process.exit(2);
          }
        }
        const allVictims = collectRunningAgentsInTree({
          repoPath,
          branch: rootBranch,
          slug: rootSlug,
        });
        const victims = filterVictimsToSubtree(
          allVictims,
          opts.agentId ?? null
        );
        if (allVictims.length === 0) {
          console.log("nothing to kill — no running agents found in the tree.");
          return;
        }
        if (opts.agentId && victims.length === 0) {
          console.error(
            `no running agents under ${opts.agentId} (bad id, already stopped, or missing selfAgentId/parentAgentId in state). Retry without --agent-id to list all.`
          );
          process.exit(1);
        }
        const scope = opts.agentId ? `subtree of ${opts.agentId}` : "tree";
        console.error(
          `about to cancel ${victims.length} cloud agent(s) in ${scope}:`
        );
        for (const v of victims) {
          const parent = v.parentAgentId ? ` <- ${v.parentAgentId}` : "";
          console.error(
            `  ${v.taskName.padEnd(28)} ${v.agentId}${parent}  (${v.branch})`
          );
        }
        if (!opts.yes) {
          console.error("");
          console.error("re-run with -y to confirm.");
          process.exit(1);
        }
        let cancelled = 0;
        let failed = 0;
        for (const v of victims) {
          try {
            await cancelCloudRun({
              apiKey,
              agentId: v.agentId,
              runId: v.runId,
            });
            cancelled++;
          } catch (err) {
            console.error(`${v.taskName} (${v.agentId}): ${errorMessage(err)}`);
            failed++;
          }
        }
        console.log(`killed ${cancelled} cloud agent(s); ${failed} failed.`);
      }
    );
}

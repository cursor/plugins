// cursor-team-kit - OpenCode adapter for Cursor plugin
// Reads existing assets (skills/, agents/, rules/, hooks/) at runtime and registers via OpenCode plugin API.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";

const PLUGIN_DIR = fileURLToPath(new URL(".", import.meta.url));

export const CursorTeamKitPlugin = async ({ directory }) => ({
  config: async (config) => {
    const skills = ["check-compiler-errors","control-cli","control-ui","deslop","fix-ci","fix-merge-conflicts","get-pr-comments","loop-on-ci","make-pr-easy-to-review","new-branch-and-pr","pr-review-canvas","review-and-ship","run-smoke-tests","thermo-nuclear-code-quality-review","verify-this","weekly-review","what-did-i-get-done","workflow-from-chats"];
    config.permission ??= { skill: {} };
    for (const s of skills) config.permission.skill[s] = "allow";
    config.agent ??= {};
    const agentsDir = join(PLUGIN_DIR, "agents");
    for (const agentFile of ["ci-watcher.md","thermo-nuclear-code-quality-review.md"]) {
      const name = agentFile.replace(/\.md$/, "");
      const prompt = await readFile(join(agentsDir, agentFile), "utf-8");
      config.agent[name] = { description: name, mode: "subagent", prompt, permission: { edit: "deny", bash: "ask" } };
    }
    config.instructions ??= [];
    const rulesDir = join(PLUGIN_DIR, "rules");
    for (const rule of ["no-inline-imports.mdc","typescript-exhaustive-switch.mdc"]) {
      config.instructions.push(join(rulesDir, rule));
    }
  },


  // No-op hooks for interface completeness
  "tool.execute.before": async () => {},
});

export default CursorTeamKitPlugin;

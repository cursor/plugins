// advisor - OpenCode adapter for Cursor plugin
// Reads existing assets (skills/, agents/, rules/, hooks/) at runtime and registers via OpenCode plugin API.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";

const PLUGIN_DIR = fileURLToPath(new URL(".", import.meta.url));

export const AdvisorPlugin = async ({ directory }) => ({
  config: async (config) => {
    const skills = ["advisor"];
    config.permission ??= { skill: {} };
    for (const s of skills) config.permission.skill[s] = "allow";
    config.agent ??= {};
    const agentsDir = join(PLUGIN_DIR, "agents");
    for (const agentFile of ["advisor-subagent.md"]) {
      const name = agentFile.replace(/\.md$/, "");
      const prompt = await readFile(join(agentsDir, agentFile), "utf-8");
      config.agent[name] = { description: name, mode: "subagent", prompt, permission: { edit: "deny", bash: "ask" } };
    }

  },

  // afterFileEdit -> tool.execute.after (filter edit tools)
  "tool.execute.after": async (input, output) => {
    const editTools = ["edit", "write", "patch", "replace"];
    if (editTools.includes(input.tool)) {
      // // Would run: mark-pending.sh
    }
  },
  // afterAgentResponse -> chat.message
  "chat.message": async (input, output) => {
    // // Would run: capture-response.sh
  },
  // subagentStop -> event listener for subagent
  event: async ({ event }) => {
    if (event.type === "session.agent.stop" && event.agent === "advisor-subagent") {
      // // Would run: record-consult.sh
    }
  },
  // stop -> session.idle
  "session.idle": async (input, output) => {
    // // Would run: stop-hook.sh
  },
  // No-op hooks for interface completeness
  "tool.execute.before": async () => {},
});

export default AdvisorPlugin;

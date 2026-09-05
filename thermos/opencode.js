// thermos - OpenCode adapter for Cursor plugin
// Reads existing assets (skills/, agents/, rules/, hooks/) at runtime and registers via OpenCode plugin API.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";

const PLUGIN_DIR = fileURLToPath(new URL(".", import.meta.url));

export const ThermosPlugin = async ({ directory }) => ({
  config: async (config) => {
    const skills = ["thermo-nuclear-code-quality-review","thermo-nuclear-review","thermos"];
    config.permission ??= { skill: {} };
    for (const s of skills) config.permission.skill[s] = "allow";
    config.agent ??= {};
    const agentsDir = join(PLUGIN_DIR, "agents");
    for (const agentFile of ["thermo-nuclear-code-quality-review-subagent.md","thermo-nuclear-review-subagent.md"]) {
      const name = agentFile.replace(/\.md$/, "");
      const prompt = await readFile(join(agentsDir, agentFile), "utf-8");
      config.agent[name] = { description: name, mode: "subagent", prompt, permission: { edit: "deny", bash: "ask" } };
    }

  },


  // No-op hooks for interface completeness
  "tool.execute.before": async () => {},
});

export default ThermosPlugin;

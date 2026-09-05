// teaching - OpenCode adapter for Cursor plugin
// Reads existing assets (skills/, agents/, rules/, hooks/) at runtime and registers via OpenCode plugin API.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";

const PLUGIN_DIR = fileURLToPath(new URL(".", import.meta.url));

export const TeachingPlugin = async ({ directory }) => ({
  config: async (config) => {
    const skills = ["create-learning-path","run-learning-retrospective"];
    config.permission ??= { skill: {} };
    for (const s of skills) config.permission.skill[s] = "allow";


  },


  // No-op hooks for interface completeness
  "tool.execute.before": async () => {},
});

export default TeachingPlugin;

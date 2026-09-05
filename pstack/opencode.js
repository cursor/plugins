// pstack - OpenCode adapter for Cursor plugin
// Reads existing assets (skills/, agents/, rules/, hooks/) at runtime and registers via OpenCode plugin API.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";

const PLUGIN_DIR = fileURLToPath(new URL(".", import.meta.url));

export const PstackPlugin = async ({ directory }) => ({
  config: async (config) => {
    const skills = ["architect","arena","automate-me","blast-radius","bro","create-verification-skill","figure-it-out","how","interrogate","maintain-verification-skill","make-bot-ui","no-comments","poteto-mode","principle-boundary-discipline","principle-build-the-lever","principle-encode-lessons-in-structure","principle-exhaust-the-design-space","principle-experience-first","principle-fix-root-causes","principle-foundational-thinking","principle-guard-the-context-window","principle-laziness-protocol","principle-make-operations-idempotent","principle-migrate-callers-then-delete-legacy-apis","principle-minimize-reader-load","principle-model-the-domain","principle-never-block-on-the-human","principle-outcome-oriented-execution","principle-prove-it-works","principle-redesign-from-first-principles","principle-separate-before-serializing-shared-state","principle-sequence-verifiable-units","principle-subtract-before-you-add","principle-type-system-discipline","recall","reflect","setup-pstack","show-me-your-work","swarm","tdd","teach","technical-writing","typescript-best-practices","unslop","why"];
    config.permission ??= { skill: {} };
    for (const s of skills) config.permission.skill[s] = "allow";
    config.agent ??= {};
    const agentsDir = join(PLUGIN_DIR, "agents");
    for (const agentFile of ["comment-sicko.md","poteto-agent.md"]) {
      const name = agentFile.replace(/\.md$/, "");
      const prompt = await readFile(join(agentsDir, agentFile), "utf-8");
      config.agent[name] = { description: name, mode: "subagent", prompt, permission: { edit: "deny", bash: "ask" } };
    }

  },


  // No-op hooks for interface completeness
  "tool.execute.before": async () => {},
});

export default PstackPlugin;

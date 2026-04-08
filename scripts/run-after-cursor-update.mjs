#!/usr/bin/env node
/**
 * One-shot workflow after Cursor refreshes the cursor-public cache from the network:
 * 1) Re-compose descriptions from marketplaceDetail (if you edited structured fields).
 * 2) Push composed manifests back into ~/.cursor/plugins/cache.
 */
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(node, args) {
  const r = spawnSync(node, args, { stdio: "inherit", cwd: root });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(process.execPath, [resolve(root, "scripts", "compose-marketplace-descriptions.mjs")]);
run(process.execPath, [resolve(root, "scripts", "sync-plugin-cache.mjs")]);
console.log("after-cursor-update: done.");

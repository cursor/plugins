#!/usr/bin/env node
/**
 * After Cursor re-downloads cursor-public plugin packages into ~/.cursor/plugins/cache,
 * copy manifests from this repo back into matching cache folders so restored copy wins.
 *
 * Usage: node scripts/sync-plugin-cache.mjs
 * Optional: PLUGIN_NAME=appwrite node scripts/sync-plugin-cache.mjs  (single plugin)
 */

import {
  readFileSync,
  copyFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { resolve, join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const cacheRoot = join(homedir(), ".cursor", "plugins", "cache", "cursor-public");

const FILES_TRY = [
  ".cursor-plugin/plugin.json",
  ".cursor-plugin/marketplace.json",
  ".mcp.json",
  "mcp.json",
];

function loadJSON(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

function findCacheDirsForPlugin(pluginName) {
  const out = [];
  if (!existsSync(cacheRoot)) return out;
  const want = String(pluginName).trim().toLowerCase();
  for (const top of readdirSync(cacheRoot)) {
    const p = join(cacheRoot, top);
    if (!statSync(p).isDirectory()) continue;
    for (const hash of readdirSync(p)) {
      const dir = join(p, hash);
      if (!statSync(dir).isDirectory()) continue;
      const pj = join(dir, ".cursor-plugin", "plugin.json");
      if (!existsSync(pj)) continue;
      try {
        const j = loadJSON(pj);
        const n = String(j.name ?? "").trim().toLowerCase();
        if (n === want) out.push(dir);
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

function syncPlugin(pluginName, sourceRel) {
  const srcDir = resolve(root, sourceRel);
  const targets = findCacheDirsForPlugin(pluginName);
  if (targets.length === 0) {
    console.warn(`No cache hit for "${pluginName}" under ${cacheRoot}`);
    return 0;
  }
  let n = 0;
  for (const destRoot of targets) {
    for (const rel of FILES_TRY) {
      const from = join(srcDir, rel);
      const to = join(destRoot, rel);
      if (!existsSync(from)) continue;
      const dir = resolve(to, "..");
      if (!existsSync(dir)) continue;
      copyFileSync(from, to);
      n++;
      console.log(`${pluginName}: ${rel} -> ${to}`);
    }
  }
  return n;
}

const only = process.env.PLUGIN_NAME?.trim();
const marketplace = loadJSON(resolve(root, ".cursor-plugin", "marketplace.json"));
const plugins = only
  ? marketplace.plugins.filter((e) => e.name === only)
  : marketplace.plugins;

let total = 0;
for (const entry of plugins) {
  total += syncPlugin(entry.name, entry.source);
}
console.log(`Done. ${total} file(s) copied.`);

#!/usr/bin/env node
/**
 * Merges marketplaceDetail into plugin.description and mirrors short copy into
 * root .cursor-plugin/marketplace.json entries. Run after editing marketplaceDetail.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const marketplacePath = resolve(root, ".cursor-plugin/marketplace.json");

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function composeDescription(detail) {
  const bullets = (detail.bestSuitedFor ?? []).map((b) => `• ${b}`).join(" ");
  return [
    `USER LEVEL: ${detail.userLevel.trim()}`,
    `PROJECT LEVEL: ${detail.projectLevel.trim()}`,
    detail.summary.trim(),
    bullets ? `BEST SUITED FOR: ${bullets}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

if (!existsSync(marketplacePath)) {
  console.error("Missing .cursor-plugin/marketplace.json");
  process.exit(1);
}

const marketplace = loadJSON(marketplacePath);
const descByName = {};

for (const entry of marketplace.plugins ?? []) {
  const pluginJsonPath = resolve(root, entry.source, ".cursor-plugin/plugin.json");
  if (!existsSync(pluginJsonPath)) {
    console.warn(`Skip ${entry.name}: no plugin.json`);
    continue;
  }
  const plugin = loadJSON(pluginJsonPath);
  const detail = plugin.marketplaceDetail;
  if (!detail) {
    console.warn(`Skip ${entry.name}: no marketplaceDetail`);
    continue;
  }
  plugin.description = composeDescription(detail);
  writeFileSync(pluginJsonPath, JSON.stringify(plugin, null, 2) + "\n", "utf-8");
  descByName[entry.name] = plugin.description;
  console.log(`Composed description for ${entry.name}`);
}

let mpChanged = false;
for (const entry of marketplace.plugins ?? []) {
  if (descByName[entry.name] != null && entry.description !== descByName[entry.name]) {
    entry.description = descByName[entry.name];
    mpChanged = true;
  }
}

if (mpChanged) {
  writeFileSync(
    marketplacePath,
    JSON.stringify(marketplace, null, 2) + "\n",
    "utf-8"
  );
  console.log("Updated .cursor-plugin/marketplace.json descriptions");
}

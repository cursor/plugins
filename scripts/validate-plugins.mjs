#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, sep } from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const marketplaceSchema = loadJSON(
  resolve(root, "schemas/marketplace.schema.json")
);
const pluginSchema = loadJSON(resolve(root, "schemas/plugin.schema.json"));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateMarketplace = ajv.compile(marketplaceSchema);
const validatePlugin = ajv.compile(pluginSchema);

let errors = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors++;
}

// 1. Validate marketplace.json
const marketplacePath = resolve(root, ".cursor-plugin/marketplace.json");

if (!existsSync(marketplacePath)) {
  fail(".cursor-plugin/marketplace.json not found");
  process.exit(1);
}

const marketplace = loadJSON(marketplacePath);

if (!validateMarketplace(marketplace)) {
  fail("marketplace.json schema validation failed:");
  for (const err of validateMarketplace.errors) {
    console.error(`  ${err.instancePath || "/"}: ${err.message}`);
  }
}

// 2. Validate each plugin
for (const entry of marketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  const pluginJsonPath = resolve(pluginDir, ".cursor-plugin/plugin.json");

  // Check source directory exists
  if (!existsSync(pluginDir)) {
    fail(
      `Plugin "${entry.name}": source directory "${entry.source}" does not exist`
    );
    continue;
  }

  // Check plugin.json exists
  if (!existsSync(pluginJsonPath)) {
    fail(
      `Plugin "${entry.name}": missing .cursor-plugin/plugin.json in "${entry.source}"`
    );
    continue;
  }

  const pluginJson = loadJSON(pluginJsonPath);

  if (!validatePlugin(pluginJson)) {
    fail(
      `Plugin "${entry.name}": plugin.json schema validation failed (${entry.source}/.cursor-plugin/plugin.json):`
    );
    for (const err of validatePlugin.errors) {
      const detail =
        err.keyword === "additionalProperties"
          ? `${err.message}: "${err.params.additionalProperty}"`
          : err.message;
      console.error(`  ${err.instancePath || "/"}: ${detail}`);
    }
  }

  // Check that marketplace name matches plugin name
  if (pluginJson.name && pluginJson.name !== entry.name) {
    fail(
      `Plugin "${entry.name}": marketplace name does not match plugin.json name "${pluginJson.name}"`
    );
  }
}

const claudeMarketplacePath = resolve(root, ".claude-plugin/marketplace.json");
const claudeMarketplace = existsSync(claudeMarketplacePath)
  ? loadJSON(claudeMarketplacePath)
  : { plugins: [] };

for (const entry of claudeMarketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  const pluginJsonPath = resolve(pluginDir, ".claude-plugin/plugin.json");

  if (!existsSync(pluginJsonPath)) {
    fail(
      `Plugin "${entry.name}": missing .claude-plugin/plugin.json in "${entry.source}"`
    );
    continue;
  }

  const pluginJson = loadJSON(pluginJsonPath);
  if (pluginJson.name && pluginJson.name !== entry.name) {
    fail(
      `Plugin "${entry.name}": Claude marketplace name does not match .claude-plugin/plugin.json name "${pluginJson.name}"`
    );
  }
}

const manifestPaths = [
  ".cursor-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "plugin.json",
];
const codexMarketplacePath = resolve(root, ".agents/plugins/marketplace.json");
const codexMarketplace = existsSync(codexMarketplacePath)
  ? loadJSON(codexMarketplacePath)
  : { plugins: [] };
const codexSources = [];

for (const entry of codexMarketplace.plugins ?? []) {
  if (entry.source?.source !== "local" || typeof entry.source.path !== "string" || !entry.source.path.startsWith("./")) {
    fail(`Plugin "${entry.name}": Codex marketplace source must be a ./-prefixed local path`);
    continue;
  }
  const pluginDir = resolve(root, entry.source.path);
  if (!pluginDir.startsWith(root + sep)) {
    fail(`Plugin "${entry.name}": Codex marketplace source leaves the repository`);
    continue;
  }
  codexSources.push({ ...entry, source: entry.source.path });
  const manifestPath = resolve(pluginDir, "plugin.json");
  if (!existsSync(manifestPath)) {
    fail(`Plugin "${entry.name}": missing portable plugin.json in "${entry.source.path}"`);
    continue;
  }
  const manifest = loadJSON(manifestPath);
  if (manifest.name !== entry.name) fail(`Plugin "${entry.name}": Codex marketplace name differs from plugin.json`);
  if (typeof entry.category !== "string" || !entry.category ||
      !["AVAILABLE", "INSTALLED_BY_DEFAULT", "NOT_AVAILABLE"].includes(entry.policy?.installation) ||
      !["ON_INSTALL", "ON_USE"].includes(entry.policy?.authentication)) {
    fail(`Plugin "${entry.name}": Codex marketplace policy or category is missing or unsupported`);
  }
}
const sources = new Map();
for (const entry of [
  ...(marketplace.plugins ?? []),
  ...(claudeMarketplace.plugins ?? []),
  ...codexSources,
]) {
  sources.set(resolve(root, entry.source), entry.name);
}

for (const [pluginDir, name] of sources) {
  const versions = manifestPaths
    .map((path) => resolve(pluginDir, path))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, version: loadJSON(path).version }))
    .filter(({ version }) => version !== undefined);

  if (new Set(versions.map(({ version }) => version)).size > 1) {
    fail(`Plugin "${name}": manifest versions differ:`);
    for (const { path, version } of versions) {
      console.error(`  ${path.slice(root.length + 1)}: ${version}`);
    }
  }
}

// 3. Report results
if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("All plugins validated successfully.");
  process.exit(0);
}

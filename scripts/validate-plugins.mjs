#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
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
  // The schema allows `source` to be a remote URL. Nothing here fetches it, so
  // say so instead of resolving it as a path (which turns "https://x" into
  // "<root>/https:/x" and reports a missing directory).
  if (/^https?:\/\//i.test(entry.source)) {
    console.log(
      `INFO: Plugin "${entry.name}": remote source "${entry.source}" is not validated locally`
    );
    continue;
  }
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
  "plugin.json",
];
const sources = new Map();
for (const entry of [
  ...(marketplace.plugins ?? []),
  ...(claudeMarketplace.plugins ?? []),
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

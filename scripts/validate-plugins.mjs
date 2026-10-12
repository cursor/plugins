#!/usr/bin/env node

import { readFileSync, existsSync, statSync } from "fs";
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

const GLOB_CHARS = /[*?{}[\]]/;
const URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

// Return the static directory prefix of a glob pattern: the path up to (not
// including) the first segment that contains a glob metacharacter.
function globBaseDir(pattern) {
  const segments = pattern.split("/");
  const base = [];
  for (const segment of segments) {
    if (GLOB_CHARS.test(segment)) break;
    base.push(segment);
  }
  return base.join("/");
}

// A declared component path is a plain path relative to the plugin root or a
// glob pattern. Absolute URLs (allowed for `logo`) are skipped. For globs we
// only require the static base directory to exist.
function checkComponentPath(pluginName, pluginDir, field, raw) {
  if (typeof raw !== "string" || raw.length === 0) return;
  if (URL_PATTERN.test(raw)) return;

  if (GLOB_CHARS.test(raw)) {
    const baseDir = globBaseDir(raw);
    const base = resolve(pluginDir, baseDir);
    if (!existsSync(base)) {
      fail(
        `Plugin "${pluginName}": ${field} glob "${raw}" matches nothing — base directory "${baseDir}" does not exist`
      );
    }
    return;
  }

  const target = resolve(pluginDir, raw);
  if (!existsSync(target)) {
    fail(`Plugin "${pluginName}": ${field} path "${raw}" does not exist`);
    return;
  }
  if (raw.endsWith("/") && !statSync(target).isDirectory()) {
    fail(`Plugin "${pluginName}": ${field} path "${raw}" is not a directory`);
  }
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

  // Check that declared component paths exist
  for (const field of ["skills", "agents", "rules", "commands"]) {
    const value = pluginJson[field];
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      checkComponentPath(entry.name, pluginDir, field, item);
    }
  }

  if (typeof pluginJson.hooks === "string") {
    checkComponentPath(entry.name, pluginDir, "hooks", pluginJson.hooks);
  }

  const mcpServers = pluginJson.mcpServers;
  if (Array.isArray(mcpServers)) {
    for (const server of mcpServers) {
      if (typeof server === "string") {
        checkComponentPath(entry.name, pluginDir, "mcpServers", server);
      }
    }
  } else if (typeof mcpServers === "string") {
    checkComponentPath(entry.name, pluginDir, "mcpServers", mcpServers);
  }

  if (typeof pluginJson.logo === "string") {
    checkComponentPath(entry.name, pluginDir, "logo", pluginJson.logo);
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

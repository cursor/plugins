#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { dirname, relative, resolve } from "path";
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

// Fields whose declared value is a path (or glob) relative to the plugin
// directory. `hooks`/`mcpServers` may also be inline objects and `logo` may
// be an absolute URL per the schema — those are skipped by the caller.
const COMPONENT_PATH_FIELDS = ["skills", "agents", "commands", "rules"];
const COMPONENT_SINGLE_PATH_FIELDS = ["hooks", "mcpServers", "logo"];

function isAbsoluteUrl(value) {
  return /^(?:https?:|data:)/i.test(value);
}

// Verify that a path declared in plugin.json resolves to an existing file or
// directory under the plugin directory. Schema validation only checks the
// shape of plugin.json, so a typo'd component path (e.g. "skils/" or a
// renamed hook file) currently passes CI and silently fails to load in
// Cursor. Glob patterns are checked against their static directory prefix so
// a typo in the base directory is still caught.
function checkReferencedPath(pluginName, pluginDir, field, declared) {
  if (typeof declared !== "string") return;

  if (declared.trim().length === 0) {
    fail(`Plugin "${pluginName}": ${field} path must not be empty`);
    return;
  }

  // The schema allows `logo` to be an absolute URL; every other component
  // field is a local path, so a remote-looking value there is a mistake the
  // existence check would otherwise silently skip.
  if (isAbsoluteUrl(declared)) {
    if (field === "logo") return;
    fail(
      `Plugin "${pluginName}": ${field} path "${declared}" must be a local path relative to the plugin directory`
    );
    return;
  }

  const normalized = declared.replace(/^\.\//, "").replace(/\/+$/, "");
  if (!normalized || normalized.startsWith("/")) {
    fail(
      `Plugin "${pluginName}": ${field} path "${declared}" must be relative to the plugin directory`
    );
    return;
  }
  if (normalized.split(/[\\/]/).includes("..")) {
    fail(
      `Plugin "${pluginName}": ${field} path "${declared}" must not escape the plugin directory`
    );
    return;
  }

  const globIndex = normalized.search(/[*?[\]]/);
  const staticPart =
    globIndex >= 0
      ? normalized.slice(0, globIndex).replace(/\/+$/, "")
      : normalized;
  const fullPath = resolve(pluginDir, staticPart);
  if (!existsSync(fullPath)) {
    fail(
      `Plugin "${pluginName}": ${field} path "${declared}" does not exist (resolved to ${relative(root, fullPath)})`
    );
  }
}

// Check every component path declared by a plugin.json. Strings that may also
// be inline objects (hooks/mcpServers) are skipped, not treated as paths.
function checkPluginComponentPaths(pluginName, pluginDir, pluginJson) {
  for (const field of [...COMPONENT_PATH_FIELDS, ...COMPONENT_SINGLE_PATH_FIELDS]) {
    const value = pluginJson[field];
    if (value === undefined) continue;
    const patterns = Array.isArray(value) ? value : [value];
    for (const pattern of patterns) {
      if (typeof pattern !== "string") continue;
      checkReferencedPath(pluginName, pluginDir, field, pattern);
    }
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

  // Check that component paths declared in plugin.json exist under the plugin
  // directory. A typo'd skill/hook path passes schema validation but silently
  // fails to load in Cursor, so catch it at review time.
  checkPluginComponentPaths(entry.name, pluginDir, pluginJson);
}

// 3. Report results
if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("All plugins validated successfully.");
  process.exit(0);
}

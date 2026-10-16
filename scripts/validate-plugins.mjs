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

// Cursor runtime interpolation is not user-configured plugin configuration.
// https://cursor.com/docs/reference/plugins#variables
// https://cursor.com/docs/mcp#config-interpolation
const runtimeVariables = new Set([
  "CURSOR_PLUGIN_ROOT", "CLAUDE_PLUGIN_ROOT", "userHome", "workspaceFolder",
  "workspaceFolderBasename", "pathSeparator", "/",
]);

function checkMcpVariables(plugin, pluginDir, name) {
  const declared = plugin.variables?.properties ?? {};
  const configs = plugin.mcpServers === undefined
    ? (existsSync(resolve(pluginDir, "mcp.json")) ? ["mcp.json"] : [])
    : (Array.isArray(plugin.mcpServers) ? plugin.mcpServers : [plugin.mcpServers]);

  function visit(value, location) {
    if (typeof value === "string") {
      for (const [, variable] of value.matchAll(/\$\{([^{}]+)\}/g)) {
        // Leave environment references and shell/default expressions alone;
        // only plain ${VAR} references are plugin-variable declarations.
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable) ||
            runtimeVariables.has(variable) || Object.hasOwn(declared, variable)) continue;
        fail(`Plugin "${name}": ${location} references undeclared variable "${variable}" (declare it in variables.properties)`);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${location}[${index}]`));
    } else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) visit(item, `${location}.${key}`);
    }
  }

  for (const [index, config] of configs.entries()) {
    if (typeof config !== "string") {
      visit(config, `mcpServers[${index}]`);
      continue;
    }
    const path = resolve(pluginDir, config);
    let content;
    try {
      content = loadJSON(path);
    } catch (error) {
      const reason = error instanceof SyntaxError ? "invalid JSON" : error.code;
      fail(`Plugin "${name}": cannot read MCP config "${config}" (${reason})`);
      continue;
    }
    visit(content, config);
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

  checkMcpVariables(pluginJson, pluginDir, entry.name);

  // Check that marketplace name matches plugin name
  if (pluginJson.name && pluginJson.name !== entry.name) {
    fail(
      `Plugin "${entry.name}": marketplace name does not match plugin.json name "${pluginJson.name}"`
    );
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

#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname, basename, relative } from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const marketplaceSchema = loadJSON(
  resolve(root, "schemas/marketplace.schema.json")
);
const pluginSchema = loadJSON(resolve(root, "schemas/plugin.schema.json"));
const skillSchema = loadJSON(resolve(root, "schemas/skill.schema.json"));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateMarketplace = ajv.compile(marketplaceSchema);
const validatePlugin = ajv.compile(pluginSchema);
const validateSkill = ajv.compile(skillSchema);

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

// 3. Check every plugin in the repository is registered in the marketplace
const marketplaceSources = new Set(
  (marketplace.plugins ?? []).map((entry) => resolve(root, entry.source))
);

const pluginDirs = [];

(function collectPluginDirs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = resolve(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (existsSync(resolve(full, ".cursor-plugin/plugin.json"))) {
      pluginDirs.push(full);
    } else {
      collectPluginDirs(full);
    }
  }
})(root);

for (const pluginDir of pluginDirs) {
  if (!marketplaceSources.has(pluginDir)) {
    fail(
      `${relative(root, pluginDir)}: has a .cursor-plugin/plugin.json but is not listed in .cursor-plugin/marketplace.json`
    );
  }
}

// 4. Validate skill frontmatter
const skillFiles = [];

(function collectSkillFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) collectSkillFiles(full);
    else if (entry.name === "SKILL.md") skillFiles.push(full);
  }
})(root);

for (const skillPath of skillFiles.sort()) {
  const skillRel = relative(root, skillPath);
  const text = readFileSync(skillPath, "utf-8");
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);

  if (!frontmatterMatch) {
    fail(`${skillRel}: missing YAML frontmatter (file must start with "---")`);
    continue;
  }

  let frontmatter;
  try {
    frontmatter = parseYaml(frontmatterMatch[1]) ?? {};
  } catch (err) {
    fail(`${skillRel}: frontmatter is not valid YAML (${err.message.split("\n")[0]})`);
    continue;
  }

  if (!validateSkill(frontmatter)) {
    fail(`${skillRel}: frontmatter does not match schemas/skill.schema.json:`);
    for (const err of validateSkill.errors) {
      console.error(`  ${err.instancePath || "/"}: ${err.message}`);
    }
    continue;
  }

  const folder = basename(dirname(skillPath));
  if (frontmatter.name !== folder) {
    fail(
      `${skillRel}: frontmatter name "${frontmatter.name}" does not match folder name "${folder}"`
    );
  }
}

// 5. Report results
if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("All plugins validated successfully.");
  process.exit(0);
}

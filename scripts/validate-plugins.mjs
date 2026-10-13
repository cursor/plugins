#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
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
let warnings = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors++;
}

// Reported but not fatal. Used for rules that main does not satisfy yet; flip
// a rule to fail() once the existing offenders are fixed.
function warn(message) {
  console.error(`WARN: ${message}`);
  warnings++;
}

// Skill frontmatter rules, from cursor.com/docs/context/skills: `name` and
// `description` are required; `name` is lowercase letters, digits and hyphens
// and must match the parent folder; descriptions are capped at 1024 characters.
const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKILL_DESCRIPTION_MAX = 1024;

// Minimal YAML-subset frontmatter reader: top-level `key: value` pairs, quoted
// scalars, and `>` / `|` block scalars (with optional `-`/`+` chomping) whose
// continuation lines are indented. Returns null when there is no frontmatter.
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const lines = text.slice(text.indexOf("\n") + 1, end).split("\n");
  const fields = {};
  for (let i = 0; i < lines.length; i++) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (/^[>|][-+]?$/.test(value)) {
      const folded = value.startsWith(">");
      const block = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "")) {
        block.push(lines[++i].trim());
      }
      value = folded ? block.join(" ").trim() : block.join("\n").trim();
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return fields;
}

function checkSkillFrontmatter(pluginName, skillDir) {
  const skillFile = join(skillDir, "SKILL.md");
  if (!existsSync(skillFile)) return;
  const dirName = skillDir.split(/[\\/]/).pop();
  const label = `Plugin "${pluginName}": skill "${dirName}"`;
  const fields = parseFrontmatter(readFileSync(skillFile, "utf-8"));
  if (!fields) {
    fail(`${label} has no YAML frontmatter in SKILL.md`);
    return;
  }
  if (!fields.name) {
    fail(`${label} is missing "name" in SKILL.md frontmatter`);
  } else if (!SKILL_NAME_PATTERN.test(fields.name)) {
    warn(`${label} has name "${fields.name}"; names are lowercase letters, digits and hyphens`);
  } else if (fields.name !== dirName) {
    warn(`${label} has name "${fields.name}" but lives in "${dirName}"; name must match the parent folder`);
  }
  if (!fields.description) {
    fail(`${label} is missing "description" in SKILL.md frontmatter`);
  } else if (fields.description.length > SKILL_DESCRIPTION_MAX) {
    warn(`${label} description is ${fields.description.length} characters; the limit is ${SKILL_DESCRIPTION_MAX}`);
  }
}

// Skills live in the plugin's declared `skills` directory, or `skills/` by default.
function checkPluginSkills(pluginName, pluginDir, declared) {
  const dirs = declared === undefined ? ["skills/"] : Array.isArray(declared) ? declared : [declared];
  for (const raw of dirs) {
    if (typeof raw !== "string" || /[*?{}[\]]/.test(raw)) continue;
    const dir = resolve(pluginDir, raw);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const child of readdirSync(dir)) {
      const skillDir = join(dir, child);
      if (statSync(skillDir).isDirectory()) checkSkillFrontmatter(pluginName, skillDir);
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

  // Check SKILL.md frontmatter for every skill the plugin ships
  checkPluginSkills(entry.name, pluginDir, pluginJson.skills);
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
if (warnings > 0) {
  console.error(`\n${warnings} warning(s).`);
}
if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("All plugins validated successfully.");
  process.exit(0);
}

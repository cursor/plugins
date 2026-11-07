#!/usr/bin/env node

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateConfig } from "./lib/pstack-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => JSON.parse(readFileSync(join(ROOT, path), "utf8"));
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const rootSchema = {
  type: "object", additionalProperties: false, required: ["$schema", "name"],
  properties: {
    $schema: { const: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json" },
    name: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$", not: { pattern: "--|\\.\\." } },
    version: { type: "string" }, description: { type: "string" },
    author: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, url: { type: "string" }, email: { type: "string" } } },
    homepage: { type: "string" }, repository: { type: "string" }, license: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    extensions: { type: "object" },
  },
};
function validate(schema, value, label) {
  const check = ajv.compile(schema);
  if (!check(value)) throw new Error(`${label}: ${ajv.errorsText(check.errors)}`);
}
const manifest = read("plugin.json");
validate(rootSchema, manifest, "portable manifest");
if (manifest.name !== "pstack") throw new Error("Package name must remain pstack");
if (manifest.repository !== "https://github.com/erikschlegel/fde-skill-stack") throw new Error("Repository identity is incorrect");
validate(read("schemas/plugin.schema.json"), read(".cursor-plugin/plugin.json"), "Cursor manifest");
for (const path of [".cursor-plugin/plugin.json", ".claude-plugin/plugin.json", "dist/cursor/.cursor-plugin/plugin.json", "dist/claude-code/.claude-plugin/plugin.json"]) {
  const value = read(path);
  if (value.name !== manifest.name || value.version !== manifest.version || value.license !== "MIT") throw new Error(`Manifest mismatch: ${path}`);
}
const market = read(".claude-plugin/marketplace.json");
if (market.plugins.length !== 1 || market.plugins[0].name !== "pstack" || market.plugins[0].source !== "./") throw new Error("Marketplace must install only the root plugin");
validateConfig(read("config/defaults.json"));
const removed = [
  "pstack", "third_party", "advisor", "agent-compatibility", "cli-for-agent",
  "continual-learning", "create-plugin", "cursor-sdk", "cursor-team-kit",
  "docs-canvas", "dyl-stack", "grok-voice", "orchestrate", "origin-apps",
  "pr-review-canvas", "ralph-loop", "teaching", "thermos", "harness",
  ".cursor-plugin/marketplace.json",
];
for (const path of removed) if (existsSync(join(ROOT, path))) throw new Error(`Obsolete monorepo resource remains: ${path}`);
for (const name of readdirSync(join(ROOT, "com.github.copilot/agents"))) {
  const text = readFileSync(join(ROOT, "com.github.copilot/agents", name), "utf8");
  if (!name.endsWith(".agent.md") || !text.includes("description:") || !text.includes("tools:") || !text.includes("../../docs/core.md")) throw new Error(`Incomplete Copilot agent ${name}`);
  if (name !== "poteto-agent.agent.md" && !text.includes('tools: ["read","search"]')) throw new Error(`Reader has write-capable tools: ${name}`);
}
const docs = spawnSync(process.execPath, [join(ROOT, "scripts/check-pstack-docs.mjs")], { stdio: "inherit" });
if (docs.status !== 0) process.exit(docs.status ?? 1);
console.log("Standalone plugin manifests, configuration, agents, and root installation paths are valid.");

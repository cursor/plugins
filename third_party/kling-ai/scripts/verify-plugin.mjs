#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_KEY = "kling-ai";
const ENDPOINT = "https://kling.ai/mcp/plugin";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function verifyPlugin() {
  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };

  const packageJson = readJson(join(repoRoot, "package.json"));
  const manifest = readJson(join(repoRoot, ".cursor-plugin/plugin.json"));
  const mcp = readJson(join(repoRoot, "mcp.json"));
  const servers = mcp.mcpServers ?? {};

  check(manifest.name === "kling-ai", "manifest name must be kling-ai");
  check(manifest.version === packageJson.version, "manifest and package versions must match");
  check(manifest.homepage === "https://kling.ai", "homepage must use the Global Kling site");
  check(
    manifest.repository === "https://github.com/klingai-tech/cursor-plugin",
    "manifest repository must match this repository"
  );
  check(
    manifest.rules === "rules" &&
      manifest.skills === "skills" &&
      manifest.mcpServers === "mcp.json",
    "manifest must reference native Cursor components"
  );
  check(!Object.hasOwn(manifest, "commands"), "the core Skill provides the /kling-ai entrypoint");
  check(JSON.stringify(Object.keys(servers)) === JSON.stringify([SERVER_KEY]), `plugin must register only ${SERVER_KEY}`);
  check(servers[SERVER_KEY]?.type === "http", "MCP transport must be http");
  check(servers[SERVER_KEY]?.url === ENDPOINT, `MCP endpoint must be ${ENDPOINT}`);

  for (const path of [
    "assets/kling-logo.png",
    "rules/kling-ai.mdc",
    "skills/kling-ai/SKILL.md",
    "skills/kling-ai-generate-image/SKILL.md",
    "skills/kling-ai-generate-video/SKILL.md"
  ]) {
    check(existsSync(join(repoRoot, path)), `${path} is missing`);
  }

  for (const forbidden of [
    ".cursor-plugin/marketplace.json",
    "commands/kling-ai.md",
    "kling-ai",
    "plugin.json",
    "ui",
    "server",
    "mcp-app",
    "scripts/kling-monitor.mjs"
  ]) {
    check(!existsSync(join(repoRoot, forbidden)), `single Global plugin must not bundle ${forbidden}`);
  }

  if (failures.length > 0) {
    throw new Error(`Cursor plugin verification failed:\n- ${failures.join("\n- ")}`);
  }

  return { name: manifest.name, endpoint: ENDPOINT, version: manifest.version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyPlugin();
  console.log(`Verified ${result.name} ${result.version} at ${result.endpoint}.`);
}

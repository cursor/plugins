#!/usr/bin/env node
/**
 * preToolUse: deny Write/StrReplace that append Learned sections to a
 * repo-tracked AGENTS.md / CLAUDE.md / GEMINI.md.
 */

import { spawnSync } from "node:child_process";
import { basename } from "node:path";

const BLOCKED_NAMES = new Set(["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);
const LEARNED_RE = /## Learned (User Preferences|Workspace Facts)/;

function collectEditText(toolInput) {
  if (!toolInput || typeof toolInput !== "object") {
    return "";
  }
  const chunks = [];
  for (const key of ["contents", "new_string", "old_string"]) {
    if (typeof toolInput[key] === "string") {
      chunks.push(toolInput[key]);
    }
  }
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (edit && typeof edit.new_string === "string") {
        chunks.push(edit.new_string);
      }
    }
  }
  return chunks.join("\n");
}

function extractPath(data) {
  const toolInput = data.tool_input ?? data.arguments ?? {};
  const candidates = [
    data.file_path,
    data.path,
    toolInput.path,
    toolInput.file_path,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return "";
}

function isRepoRootFile(filePath) {
  const name = basename(filePath);
  if (!BLOCKED_NAMES.has(name)) {
    return false;
  }
  if (name === "AGENTS.md" && filePath.endsWith("AGENTS.local.md")) {
    return false;
  }
  return true;
}

function isInsideGitWorkTree(filePath) {
  const result = spawnSync(
    "git",
    ["-C", filePath.replace(/\/[^/]+$/, "") || ".", "rev-parse", "--is-inside-work-tree"],
    { stdio: "ignore" }
  );
  return result.status === 0;
}

const raw = await new Promise((resolve) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
});

let data = {};
try {
  data = raw.trim() ? JSON.parse(raw) : {};
} catch {
  console.log("{}");
  process.exit(0);
}

const filePath = extractPath(data);
const toolInput = data.tool_input ?? data.arguments ?? {};
const editText = collectEditText(toolInput);

if (isRepoRootFile(filePath) && LEARNED_RE.test(editText) && isInsideGitWorkTree(filePath)) {
  console.log(
    JSON.stringify({
      permission: "deny",
      agent_message:
        "Do not write ## Learned User Preferences / ## Learned Workspace Facts into the repo-tracked AGENTS.md. Write those bullets only to ~/.cursor/projects/<slug>/AGENTS.local.md.",
      user_message:
        "Blocked a continual-learning write to the team AGENTS.md. Memory belongs in AGENTS.local.md.",
    })
  );
  process.exit(0);
}

console.log("{}");

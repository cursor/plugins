#!/usr/bin/env node
/**
 * preToolUse: deny Write/StrReplace that append Learned sections to a
 * repo-tracked AGENTS.md / CLAUDE.md / GEMINI.md, unless that path is the
 * configured workspace file and the write is allowed.
 */

import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const BLOCKED_NAMES = new Set(["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);
const LEARNED_RE = /## Learned (User Preferences|Workspace Facts)/;

function parseBoolean(value) {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function expandPath(value, workspaceCwd) {
  let expanded = value;
  if (expanded.startsWith("~/") || expanded === "~") {
    expanded = expanded === "~" ? homedir() : join(homedir(), expanded.slice(2));
  }
  return isAbsolute(expanded) ? expanded : resolve(workspaceCwd, expanded);
}

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

function isLearnedAgentFile(filePath) {
  const name = basename(filePath);
  return BLOCKED_NAMES.has(name);
}

function isInsideGitWorkTree(filePath) {
  const result = spawnSync(
    "git",
    ["-C", dirname(resolve(filePath)), "rev-parse", "--is-inside-work-tree"],
    { stdio: "ignore" }
  );
  return result.status === 0;
}

function isGitIgnored({ workspaceCwd, filePath }) {
  const result = spawnSync(
    "git",
    ["-C", workspaceCwd, "check-ignore", "-q", "--", filePath],
    { stdio: "ignore" }
  );
  return result.status === 0;
}

function isAllowedSharedWorkspaceFile(filePath) {
  const raw = process.env.CONTINUAL_LEARNING_WORKSPACE_FILE;
  if (!raw || !raw.trim()) {
    return false;
  }
  const workspaceCwd = process.cwd();
  const configured = expandPath(raw.trim(), workspaceCwd);
  if (resolve(filePath) !== resolve(configured)) {
    return false;
  }
  if (parseBoolean(process.env.CONTINUAL_LEARNING_ALLOW_SHARED)) {
    return true;
  }
  return isGitIgnored({ workspaceCwd, filePath: configured });
}

const raw = await new Promise((resolvePromise) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
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

if (
  isLearnedAgentFile(filePath) &&
  LEARNED_RE.test(editText) &&
  isInsideGitWorkTree(filePath) &&
  !isAllowedSharedWorkspaceFile(filePath)
) {
  console.log(
    JSON.stringify({
      permission: "deny",
      agent_message:
        "Do not write ## Learned User Preferences / ## Learned Workspace Facts into the repo-tracked AGENTS.md. Write those bullets only to ~/.cursor/projects/<slug>/AGENTS.local.md (or the configured workspace file when it is allowed).",
      user_message:
        "Blocked a continual-learning write to a tracked agent file. Memory belongs in AGENTS.local.md unless a shared workspace file is explicitly allowed.",
    })
  );
  process.exit(0);
}

console.log("{}");

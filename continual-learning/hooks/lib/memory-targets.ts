/// <reference types="bun-types-no-globals/lib/index.d.ts" />

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Resolved on-disk locations the continual-learning plugin writes to.
 *
 * `userFile` is always per-user (default lives under
 * `~/.cursor/projects/<workspace-slug>/`) and is the only target that is
 * guaranteed safe on team repos.
 *
 * `workspaceFile` is opt-in via `CONTINUAL_LEARNING_WORKSPACE_FILE`. The hook
 * resolves it and runs a git-leak check before allowing writes; the result of
 * that check is reported in `workspaceFileBlockReason`.
 */
export interface MemoryTargets {
  readonly workspaceCwd: string;
  readonly workspaceSlug: string;
  readonly stateDir: string;
  readonly cadenceFile: string;
  readonly indexFile: string;
  readonly userFile: string;
  readonly workspaceFile: string | null;
  readonly workspaceFileBlocked: boolean;
  readonly workspaceFileBlockReason: string | null;
  readonly allowShared: boolean;
}

/**
 * Convert an absolute workspace path to the slug Cursor uses for
 * `~/.cursor/projects/<slug>/`. Mirrors the convention already used by
 * the agent-transcripts directory: drop the leading `/`, then `/` → `-`.
 */
export function computeWorkspaceSlug(workspaceCwd: string): string {
  const abs = resolve(workspaceCwd);
  return abs.replace(/^\//, "").replace(/\//g, "-");
}

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  return raw && raw.trim().length > 0 ? raw : undefined;
}

function parseBoolean(value: string | undefined): boolean {
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

function expandPath(value: string, workspaceCwd: string): string {
  let expanded = value;
  if (expanded.startsWith("~/") || expanded === "~") {
    expanded = expanded === "~" ? homedir() : join(homedir(), expanded.slice(2));
  }
  return isAbsolute(expanded) ? expanded : resolve(workspaceCwd, expanded);
}

/**
 * Run `git check-ignore` from the workspace root. Returns true when the path
 * is inside a git repo and is NOT ignored — i.e. writing to it would leak the
 * file into the team's commits.
 */
export function isPathTeamShared(workspaceCwd: string, filePath: string): boolean {
  const result = spawnSync(
    "git",
    ["-C", workspaceCwd, "check-ignore", "-q", "--", filePath],
    { stdio: "ignore" }
  );
  if (result.error || typeof result.status !== "number") {
    return false;
  }
  return result.status === 1;
}

export function resolveMemoryTargets(workspaceCwd = process.cwd()): MemoryTargets {
  const slug = computeWorkspaceSlug(workspaceCwd);
  const userProjectRoot = join(homedir(), ".cursor", "projects", slug);

  const stateDir = readEnv("CONTINUAL_LEARNING_STATE_DIR")
    ? expandPath(readEnv("CONTINUAL_LEARNING_STATE_DIR")!, workspaceCwd)
    : join(userProjectRoot, "continual-learning");

  const userFile = readEnv("CONTINUAL_LEARNING_USER_FILE")
    ? expandPath(readEnv("CONTINUAL_LEARNING_USER_FILE")!, workspaceCwd)
    : join(userProjectRoot, "AGENTS.local.md");

  const allowShared = parseBoolean(readEnv("CONTINUAL_LEARNING_ALLOW_SHARED"));

  let workspaceFile: string | null = null;
  let workspaceFileBlocked = false;
  let workspaceFileBlockReason: string | null = null;

  const workspaceFileRaw = readEnv("CONTINUAL_LEARNING_WORKSPACE_FILE");
  if (workspaceFileRaw) {
    workspaceFile = expandPath(workspaceFileRaw, workspaceCwd);
    if (!allowShared && isPathTeamShared(workspaceCwd, workspaceFile)) {
      workspaceFileBlocked = true;
      workspaceFileBlockReason =
        `${workspaceFile} is inside a git repo and not gitignored; ` +
        "set CONTINUAL_LEARNING_ALLOW_SHARED=1 to write to it anyway.";
    }
  }

  return {
    workspaceCwd: resolve(workspaceCwd),
    workspaceSlug: slug,
    stateDir,
    cadenceFile: join(stateDir, "cadence.json"),
    indexFile: join(stateDir, "index.json"),
    userFile,
    workspaceFile,
    workspaceFileBlocked,
    workspaceFileBlockReason,
    allowShared,
  };
}

/**
 * Old plugin versions kept cadence + index inside the workspace at
 * `.cursor/hooks/state/`. If those files exist, copy them once into the new
 * user-scoped location (and a sibling `.legacy.<basename>` backup) and remove
 * the originals so they stop polluting `git status` on team repos.
 */
export function migrateLegacyState(targets: MemoryTargets): void {
  const legacyCadence = resolve(
    targets.workspaceCwd,
    ".cursor/hooks/state/continual-learning.json"
  );
  const legacyIndex = resolve(
    targets.workspaceCwd,
    ".cursor/hooks/state/continual-learning-index.json"
  );

  const pairs: ReadonlyArray<readonly [string, string]> = [
    [legacyCadence, targets.cadenceFile],
    [legacyIndex, targets.indexFile],
  ];

  for (const [from, to] of pairs) {
    if (!existsSync(from)) {
      continue;
    }
    try {
      const contents = readFileSync(from, "utf-8");
      mkdirSync(dirname(to), { recursive: true });
      if (!existsSync(to)) {
        writeFileSync(to, contents, "utf-8");
      }
      // Keep a backup outside the repo under the user-scoped state dir so the
      // original content is recoverable without polluting `git status`.
      const backup = join(targets.stateDir, `legacy.${basename(from)}`);
      if (!existsSync(backup)) {
        writeFileSync(backup, contents, "utf-8");
      }
      // Remove the original so it no longer shows up in `git status`.
      const fs = require("node:fs") as typeof import("node:fs");
      fs.rmSync(from, { force: true });
    } catch {
      // best effort
    }
  }
}

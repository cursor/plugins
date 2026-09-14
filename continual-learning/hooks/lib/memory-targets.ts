/// <reference types="bun-types-no-globals/lib/index.d.ts" />

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

/**
 * On-disk locations this plugin writes to.
 *
 * Default is always the personal file under ~/.cursor/projects/<slug>/ so a
 * team-owned AGENTS.md is never the learning target.
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
}

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
 * git check-ignore -q: exit 0 = ignored, 1 = not ignored (would leak if written).
 */
export function isPathTeamShared(args: {
  workspaceCwd: string;
  filePath: string;
}): boolean {
  const result = spawnSync(
    "git",
    ["-C", args.workspaceCwd, "check-ignore", "-q", "--", args.filePath],
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
    if (!allowShared && isPathTeamShared({ workspaceCwd, filePath: workspaceFile })) {
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
  };
}

/**
 * Copy legacy repo state into the user-scoped dir. Do not delete the originals
 * when they are tracked — that would create a noisy git diff.
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

  const pairs: ReadonlyArray<[string, string]> = [
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
      const backup = join(targets.stateDir, `legacy.${basename(from)}`);
      if (!existsSync(backup)) {
        writeFileSync(backup, contents, "utf-8");
      }
      if (!isGitTracked({ workspaceCwd: targets.workspaceCwd, filePath: from })) {
        try {
          rmSync(from, { force: true });
        } catch {
          // best effort
        }
      }
    } catch {
      // best effort
    }
  }
}

function isGitTracked(args: { workspaceCwd: string; filePath: string }): boolean {
  const result = spawnSync(
    "git",
    ["-C", args.workspaceCwd, "ls-files", "--error-unmatch", "--", args.filePath],
    { stdio: "ignore" }
  );
  return result.status === 0;
}

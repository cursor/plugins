#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const DEFAULT_TIMEOUT_MS = 1_800_000;
const DEFAULT_IDLE_TIMEOUT_MS = 300_000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const CLAUDE_STREAM_TYPES = new Set([
  "system",
  "assistant",
  "user",
  "stream_event",
  "result",
  "rate_limit_event",
  "content_block_delta",
]);
const CODEX_STREAM_TYPES = new Set([
  "thread.started",
  "turn.started",
  "turn.completed",
  "turn.failed",
  "item.started",
  "item.updated",
  "item.completed",
  "error",
]);
const PROBE_TIMEOUT_MS = 5_000;
const KILL_GRACE_MS = 500;
const MAX_SNAP_FILE_BYTES = 20 * 1024 * 1024;
const EXIT_QUOTA = 75;
const EXIT_READONLY_VIOLATION = 76;
const QUOTA_ERROR_RE =
  /\b(?:HTTP\s*429|status(?:\s*code)?\s*[:=]\s*429|"type"\s*:\s*"rate_limit_error"|rate_limit_error|quota_exceeded|insufficient_quota|too many requests|overloaded_error)\b|you(?:'ve| have)\s+hit\s+your\s+(?:usage\s+)?limit/i;

function isQuotaFailure(stderrText, stdoutText) {
  if (QUOTA_ERROR_RE.test(stderrText)) return true;
  // Never scan multi-KB test failure logs or code reviews on stdout for "429"; only tiny direct CLI errors.
  return stdoutText.length <= 1024 && QUOTA_ERROR_RE.test(stdoutText);
}
const VALID_MODES = new Set(["readonly", "readonly-bash", "worktree"]);

function printUsage() {
  console.log(`Usage:
  run-external-agent.mjs --probe
  run-external-agent.mjs --spec <spec> --mode <readonly|readonly-bash|worktree> (--prompt <text> | --prompt-file <path>) [options]

Specs:
  cli:codex
  cli:codex:<model>
  cli:claude
  cli:claude:<model>
  cli:claude:<model>:<effort>

Options:
  --cwd <abs-path>             Working directory (required for --mode worktree)
  --main-workspace <abs-path>  Guard: refuse --mode worktree if --cwd resolves to this path
  --snapshot                   Force detached git worktree snapshot isolation (readonly / readonly-bash)
  --no-snapshot                Disable automatic git worktree snapshot isolation
  --out <abs-path>             Write final agent output to file (.partial saved on timeout/error)
  --timeout-ms <ms>            Hard wall-clock timeout in ms (1..${MAX_TIMEOUT_MS}, default: ${DEFAULT_TIMEOUT_MS})
  --idle-timeout-ms <ms>       Inactivity timeout without stream output (1..${MAX_TIMEOUT_MS}, default: min(${DEFAULT_IDLE_TIMEOUT_MS}, timeout-ms))
  --probe                      Check claude and codex availability/versions as JSON
  -h, --help                   Show this help`);
}

function killProcessTree(child, signal) {
  if (!child || !child.pid) return;
  if (process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (err) {
      if (err && err.code === "ESRCH") return;
    }
  }
  try {
    child.kill(signal);
  } catch {
    // Process already exited.
  }
}

function terminateAndFinish(child, onDone) {
  killProcessTree(child, "SIGTERM");
  try {
    child.stdin?.destroy();
  } catch {
    // Ignore already destroyed stream.
  }
  try {
    child.stdout?.destroy();
  } catch {
    // Ignore already destroyed stream.
  }
  try {
    child.stderr?.destroy();
  } catch {
    // Ignore already destroyed stream.
  }
  setTimeout(() => {
    killProcessTree(child, "SIGKILL");
    onDone();
  }, KILL_GRACE_MS);
}

function runCommandSyncLike(cmd, args, timeoutMs) {
  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const child = spawn(cmd, args, {
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise(result);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      terminateAndFinish(child, () => {
        finish({ available: false, version: null, error: `timeout after ${timeoutMs}ms` });
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      finish({ available: false, version: null, error: err.message });
    });

    child.on("close", (code) => {
      if (settled) return;
      if (code !== 0) {
        finish({
          available: false,
          version: null,
          error: (stderr || stdout || `exit code ${code}`).trim(),
        });
        return;
      }
      const line = stdout.trim().split(/\r?\n/)[0] ?? "";
      finish({ available: true, version: line || "unknown" });
    });
  });
}

async function handleProbe() {
  const [claude, codex] = await Promise.all([
    runCommandSyncLike("claude", ["--version"], PROBE_TIMEOUT_MS),
    runCommandSyncLike("codex", ["--version"], PROBE_TIMEOUT_MS),
  ]);
  console.log(JSON.stringify({ claude, codex }, null, 2));
}

function parseArgs(argv) {
  const opts = {
    probe: false,
    help: false,
    spec: null,
    mode: null,
    cwd: null,
    mainWorkspace: null,
    snapshotMode: "auto",
    prompt: null,
    promptFile: null,
    out: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    idleTimeoutMs: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--probe") {
      opts.probe = true;
    } else if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg === "--spec") {
      opts.spec = argv[++i] ?? null;
    } else if (arg === "--mode") {
      opts.mode = argv[++i] ?? null;
    } else if (arg === "--cwd") {
      opts.cwd = argv[++i] ?? null;
    } else if (arg === "--main-workspace") {
      opts.mainWorkspace = argv[++i] ?? null;
    } else if (arg === "--snapshot") {
      opts.snapshotMode = "force";
    } else if (arg === "--no-snapshot") {
      opts.snapshotMode = "off";
    } else if (arg === "--prompt") {
      opts.prompt = argv[++i] ?? null;
    } else if (arg === "--prompt-file") {
      opts.promptFile = argv[++i] ?? null;
    } else if (arg === "--out") {
      opts.out = argv[++i] ?? null;
    } else if (arg === "--timeout-ms") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > MAX_TIMEOUT_MS) {
        throw new Error(`Invalid --timeout-ms value: ${raw} (must be an integer between 1 and ${MAX_TIMEOUT_MS})`);
      }
      opts.timeoutMs = parsed;
    } else if (arg === "--idle-timeout-ms") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > MAX_TIMEOUT_MS) {
        throw new Error(`Invalid --idle-timeout-ms value: ${raw} (must be an integer between 1 and ${MAX_TIMEOUT_MS})`);
      }
      opts.idleTimeoutMs = parsed;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function parseSpec(spec) {
  if (!spec || typeof spec !== "string") {
    throw new Error("Missing --spec");
  }
  const parts = spec.split(":");
  if (parts[0] !== "cli" || (parts[1] !== "codex" && parts[1] !== "claude")) {
    throw new Error(`Invalid --spec ${JSON.stringify(spec)}; expected cli:codex[:<model>] or cli:claude[:<model>[:<effort>]]`);
  }
  const cli = parts[1];
  if (cli === "codex") {
    const model = parts.slice(2).join(":") || null;
    return { cli, vendor: "openai", model, effort: null };
  }
  if (parts.length > 4) {
    throw new Error(`Invalid claude spec ${JSON.stringify(spec)}; expected cli:claude[:<model>[:<effort>]]`);
  }
  const model = parts[2] || null;
  const effort = parts[3] || null;
  return { cli, vendor: "anthropic", model, effort };
}

function validateDir(pathValue, flagName) {
  if (!isAbsolute(pathValue)) {
    throw new Error(`${flagName} must be an absolute path: ${pathValue}`);
  }
  if (!existsSync(pathValue) || !statSync(pathValue).isDirectory()) {
    throw new Error(`${flagName} is not an existing directory: ${pathValue}`);
  }
}

function isSameDirectory(dirA, dirB) {
  if (realpathSync.native(dirA) === realpathSync.native(dirB)) {
    return true;
  }
  const stA = statSync(dirA);
  const stB = statSync(dirB);
  return stA.dev === stB.dev && stA.ino === stB.ino;
}

function resolveGitTopLevel(dir) {
  const res = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (res.status !== 0) {
    return null;
  }
  const top = (res.stdout ?? "").trim();
  return top ? realpathSync.native(top) : null;
}

function resolveOverlayTarget(srcEntry, gitRoot, snapRoot) {
  let targetAbs;
  try {
    const st = lstatSync(srcEntry);
    if (st.isSymbolicLink()) {
      const linkTarget = readlinkSync(srcEntry);
      targetAbs = resolve(dirname(srcEntry), linkTarget);
    } else {
      targetAbs = srcEntry;
    }
  } catch {
    return srcEntry;
  }
  const relToGitRoot = relative(gitRoot, targetAbs);
  if (relToGitRoot && !relToGitRoot.startsWith("..") && !isAbsolute(relToGitRoot)) {
    return join(snapRoot, relToGitRoot);
  }
  try {
    return realpathSync.native(targetAbs);
  } catch {
    return targetAbs;
  }
}

function mountNodeModulesOverlay(srcNm, dstNm, gitRoot, snapRoot, ignoredRelPaths, prefix) {
  if (!existsSync(srcNm) || existsSync(dstNm)) {
    return;
  }
  mkdirSync(dstNm, { recursive: true });
  // Keep Vitest/Vite and tool caches strictly inside the temp snapshot so they never mutate the real repo.
  mkdirSync(join(dstNm, ".vite"), { recursive: true });
  mkdirSync(join(dstNm, ".cache"), { recursive: true });
  ignoredRelPaths.add(`${prefix}/.vite`);
  ignoredRelPaths.add(`${prefix}/.cache`);

  for (const entry of readdirSync(srcNm, { withFileTypes: true })) {
    if (entry.name === ".vite" || entry.name === ".cache") continue;
    const srcChild = join(srcNm, entry.name);
    const dstChild = join(dstNm, entry.name);
    const childRel = `${prefix}/${entry.name}`;
    let st;
    try {
      st = lstatSync(srcChild);
    } catch {
      continue;
    }

    if (entry.name.startsWith("@") && st.isDirectory() && !st.isSymbolicLink()) {
      mkdirSync(dstChild, { recursive: true });
      for (const sub of readdirSync(srcChild, { withFileTypes: true })) {
        const srcSub = join(srcChild, sub.name);
        const dstSub = join(dstChild, sub.name);
        const target = resolveOverlayTarget(srcSub, gitRoot, snapRoot);
        if (!existsSync(dstSub)) {
          symlinkSync(target, dstSub);
          ignoredRelPaths.add(`${childRel}/${sub.name}`);
        }
      }
      continue;
    }

    const target = resolveOverlayTarget(srcChild, gitRoot, snapRoot);
    if (!existsSync(dstChild)) {
      symlinkSync(target, dstChild);
      ignoredRelPaths.add(childRel);
    }
  }
}

function digestWorktree(repoDir, ignoredRelPaths) {
  const statusRes = spawnSync("git", ["-C", repoDir, "status", "--porcelain=v1", "-z", "-uall"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  if (statusRes.status !== 0) {
    throw new Error(`Failed to compute git status in ${repoDir}: ${(statusRes.stderr ?? "").toString("utf8")}`);
  }
  const tokens = statusRes.stdout.toString("utf8").split("\0");
  const records = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || token.length < 4) continue;
    const xy = token.slice(0, 2);
    const rel = token.slice(3);
    if (xy[0] === "R" || xy[0] === "C") {
      i++;
    }
    if (ignoredRelPaths.has(rel)) continue;
    const full = join(repoDir, rel);
    let contentSig = "missing";
    try {
      const st = lstatSync(full);
      if (st.isSymbolicLink()) {
        contentSig = `symlink:${readlinkSync(full)}`;
      } else if (st.isDirectory()) {
        contentSig = "dir";
      } else if (st.size <= MAX_SNAP_FILE_BYTES) {
        contentSig = createHash("sha256").update(readFileSync(full)).digest("hex");
      } else {
        contentSig = `size:${st.size}:mtime:${st.mtimeMs}`;
      }
    } catch {
      contentSig = "missing";
    }
    records.push(`${xy}\t${rel}\t${contentSig}`);
  }
  records.sort();
  return createHash("sha256").update(records.join("\n")).digest("hex");
}

function createReadonlyGitSnapshot(cwd, gitRoot) {
  const headCheck = spawnSync("git", ["-C", gitRoot, "rev-parse", "--verify", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (headCheck.status !== 0) {
    throw new Error(`Cannot snapshot ${gitRoot}: repository has no HEAD commit`);
  }

  const realCwd = realpathSync.native(cwd);
  const relSubdir = relative(gitRoot, realCwd);
  const snapParent = mkdtempSync(join(tmpdir(), "pstack-ro-snap-"));
  const snapRoot = join(snapParent, "repo");
  const snapTmp = join(snapParent, "tmp");
  const snapCache = join(snapParent, "cache");
  mkdirSync(snapTmp, { recursive: true });
  mkdirSync(snapCache, { recursive: true });

  const ignoredRelPaths = new Set();
  const cleanup = () => {
    try {
      spawnSync("git", ["-C", gitRoot, "worktree", "remove", "--force", snapRoot], {
        stdio: "ignore",
      });
    } catch {
      // Best-effort cleanup.
    }
    try {
      rmSync(snapParent, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup.
    }
    try {
      spawnSync("git", ["-C", gitRoot, "worktree", "prune"], {
        stdio: "ignore",
      });
    } catch {
      // Best-effort cleanup.
    }
  };

  try {
    const addRes = spawnSync("git", ["-C", gitRoot, "worktree", "add", "--detach", snapRoot, "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (addRes.status !== 0) {
      throw new Error(`git worktree add failed: ${addRes.stderr || addRes.stdout}`);
    }

    const diffRes = spawnSync("git", ["-C", gitRoot, "diff", "--binary", "HEAD"], {
      maxBuffer: 64 * 1024 * 1024,
    });
    if (diffRes.status !== 0) {
      throw new Error(`git diff --binary HEAD failed: ${(diffRes.stderr ?? "").toString("utf8")}`);
    }
    if (diffRes.stdout && diffRes.stdout.length > 0) {
      const applyRes = spawnSync("git", ["-C", snapRoot, "apply", "--whitespace=nowarn"], {
        input: diffRes.stdout,
        maxBuffer: 64 * 1024 * 1024,
      });
      if (applyRes.status !== 0) {
        throw new Error(`git apply in snapshot failed: ${(applyRes.stderr ?? "").toString("utf8")}`);
      }
    }

    const untrackedRes = spawnSync("git", ["-C", gitRoot, "ls-files", "--others", "--exclude-standard", "-z"], {
      maxBuffer: 32 * 1024 * 1024,
    });
    if (untrackedRes.status !== 0) {
      throw new Error(`git ls-files failed: ${(untrackedRes.stderr ?? "").toString("utf8")}`);
    }
    const untracked = untrackedRes.stdout.toString("utf8").split("\0").filter(Boolean);
    for (const rel of untracked) {
      const cleanRel = rel.endsWith("/") ? rel.slice(0, -1) : rel;
      const src = join(gitRoot, cleanRel);
      const dst = join(snapRoot, cleanRel);
      let st;
      try {
        st = lstatSync(src);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        // Untracked nested git repo / directory entry; skip .git internals if any, copy regular subfiles <= 20MB.
        continue;
      }
      if (!st.isSymbolicLink() && st.size > MAX_SNAP_FILE_BYTES) {
        ignoredRelPaths.add(cleanRel);
        continue;
      }
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(src, dst, { dereference: false });
    }

    const snapRealRoot = realpathSync.native(snapRoot);
    mountNodeModulesOverlay(join(gitRoot, "node_modules"), join(snapRealRoot, "node_modules"), gitRoot, snapRealRoot, ignoredRelPaths, "node_modules");
    const packagesDir = join(gitRoot, "packages");
    if (existsSync(packagesDir) && statSync(packagesDir).isDirectory()) {
      for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const pkgNmRel = `packages/${entry.name}/node_modules`;
        mountNodeModulesOverlay(join(gitRoot, pkgNmRel), join(snapRealRoot, pkgNmRel), gitRoot, snapRealRoot, ignoredRelPaths, pkgNmRel);
      }
    }

    const execCwd = relSubdir ? join(snapRealRoot, relSubdir) : snapRealRoot;
    const preSnapDigest = digestWorktree(snapRealRoot, ignoredRelPaths);

    return {
      gitRoot,
      snapRoot: snapRealRoot,
      execCwd,
      snapTmp,
      snapCache,
      preSnapDigest,
      verifyUnmodified() {
        const postSnapDigest = digestWorktree(snapRealRoot, ignoredRelPaths);
        return postSnapDigest === preSnapDigest;
      },
      cleanup,
    };
  } catch (err) {
    cleanup();
    throw err;
  }
}

function buildInvocation(parsedSpec, mode, cwd, outPath) {
  if (parsedSpec.cli === "codex") {
    const args = ["exec", "--json", "--ephemeral", "--skip-git-repo-check"];
    if (mode === "worktree") {
      args.push("-s", "workspace-write", "--approve-for-me");
    } else {
      args.push("-s", "read-only");
    }
    args.push("-C", cwd);
    if (parsedSpec.model) {
      args.push("-m", parsedSpec.model);
    }
    if (outPath) {
      args.push("-o", outPath);
    }
    args.push("-");
    return { cmd: "codex", args };
  }

  const args = ["-p", "--no-session-persistence", "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
  if (mode === "readonly") {
    args.push("--tools", "Read,Grep,Glob");
  } else if (mode === "readonly-bash") {
    args.push(
      "--tools",
      "Read,Grep,Glob,Bash",
      "--disallowedTools",
      "Write,Edit,NotebookEdit",
      "--dangerously-skip-permissions",
    );
  } else {
    args.push("--dangerously-skip-permissions");
  }
  if (parsedSpec.model) {
    args.push("--model", parsedSpec.model);
  }
  if (parsedSpec.effort) {
    args.push("--effort", parsedSpec.effort);
  }
  return { cmd: "claude", args };
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Usage error: ${err.message}`);
    printUsage();
    process.exit(64);
  }

  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  if (opts.probe) {
    await handleProbe();
    process.exit(0);
  }

  let spec;
  try {
    spec = parseSpec(opts.spec);
    if (!opts.mode || !VALID_MODES.has(opts.mode)) {
      throw new Error(`--mode must be one of: ${[...VALID_MODES].join(", ")}`);
    }
    if (opts.mode === "worktree" && opts.snapshotMode === "force") {
      throw new Error("--snapshot cannot be combined with --mode worktree");
    }
    if (opts.prompt !== null && opts.promptFile !== null) {
      throw new Error("Specify either --prompt or --prompt-file, not both");
    }
    if (opts.prompt === null && opts.promptFile === null) {
      throw new Error("Missing --prompt or --prompt-file");
    }
  } catch (err) {
    console.error(`Usage error: ${err.message}`);
    process.exit(64);
  }

  const cwd = opts.cwd ?? (opts.mode === "worktree" ? null : process.cwd());
  if (!cwd) {
    console.error("Usage error: --cwd <abs-path> is required for --mode worktree");
    process.exit(64);
  }

  let gitTopLevel = null;
  try {
    validateDir(cwd, "--cwd");
    if (opts.mainWorkspace) {
      validateDir(opts.mainWorkspace, "--main-workspace");
      if (opts.mode === "worktree" && isSameDirectory(cwd, opts.mainWorkspace)) {
        console.error("Refusing --mode worktree on the main workspace; pass an isolated worktree or scratch directory");
        process.exit(2);
      }
    }
    if (opts.mode !== "worktree") {
      gitTopLevel = resolveGitTopLevel(cwd);
      if (opts.snapshotMode === "force" && !gitTopLevel) {
        throw new Error("--snapshot requires --cwd inside a git repository");
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(64);
  }

  let promptText;
  if (opts.promptFile !== null) {
    if (!existsSync(opts.promptFile)) {
      console.error(`Error: --prompt-file does not exist: ${opts.promptFile}`);
      process.exit(64);
    }
    promptText = readFileSync(opts.promptFile, "utf8");
  } else {
    promptText = opts.prompt;
  }

  let outPath = null;
  if (opts.out !== null) {
    outPath = resolve(opts.out);
    mkdirSync(dirname(outPath), { recursive: true });
  }

  const useSnapshot =
    opts.mode !== "worktree" &&
    gitTopLevel !== null &&
    (opts.snapshotMode === "force" || (opts.snapshotMode === "auto" && opts.mode === "readonly-bash"));

  let snapshot = null;
  if (useSnapshot) {
    try {
      snapshot = createReadonlyGitSnapshot(cwd, gitTopLevel);
    } catch (err) {
      console.error(`Snapshot setup error: ${err.message}`);
      process.exit(1);
    }
  }

  let cleanedSnapshot = false;
  const cleanupOnce = () => {
    if (cleanedSnapshot || !snapshot) return;
    cleanedSnapshot = true;
    snapshot.cleanup();
  };

  const execCwd = snapshot ? snapshot.execCwd : cwd;
  const childEnv = snapshot
    ? {
        ...process.env,
        TMPDIR: snapshot.snapTmp,
        PYTHONDONTWRITEBYTECODE: "1",
      }
    : process.env;

  const { cmd, args } = buildInvocation(spec, opts.mode, execCwd, outPath);

  const child = spawn(cmd, args, {
    cwd: execCwd,
    env: childEnv,
    detached: process.platform !== "win32",
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let settled = false;
  let stdoutLineBuf = "";
  let sawStreamJson = false;
  let claudeResultText = null;
  let claudeErrorText = "";
  let claudeDeltaBuf = "";
  const claudeAssistantMsgs = [];
  const codexAgentMsgs = [];
  let codexErrorText = "";

  const effectiveIdleMs = opts.idleTimeoutMs !== null ? opts.idleTimeoutMs : Math.min(DEFAULT_IDLE_TIMEOUT_MS, opts.timeoutMs);

  const processStdoutLine = (rawLine, hasNewline) => {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const obj = JSON.parse(trimmed);
        if (spec.cli === "claude" && obj && typeof obj.type === "string" && CLAUDE_STREAM_TYPES.has(obj.type)) {
          sawStreamJson = true;
          if (obj.type === "content_block_delta" && typeof obj.delta?.text === "string") {
            claudeDeltaBuf += obj.delta.text;
          } else if (obj.type === "stream_event" && typeof obj.event?.delta?.text === "string") {
            claudeDeltaBuf += obj.event.delta.text;
          } else if (obj.type === "assistant" && Array.isArray(obj.message?.content)) {
            const texts = obj.message.content
              .filter((b) => b && b.type === "text" && typeof b.text === "string")
              .map((b) => b.text);
            if (texts.length > 0) {
              claudeAssistantMsgs.push(texts.join(""));
              claudeDeltaBuf = "";
            }
          } else if (obj.type === "result") {
            if (typeof obj.result === "string") {
              claudeResultText = obj.result;
              if (obj.is_error) {
                claudeErrorText = obj.result;
              }
            }
          }
          return;
        }
        if (spec.cli === "codex" && obj && typeof obj.type === "string" && CODEX_STREAM_TYPES.has(obj.type)) {
          sawStreamJson = true;
          if (obj.type === "item.completed" && obj.item?.type === "agent_message" && typeof obj.item.text === "string") {
            codexAgentMsgs.push(obj.item.text);
          } else if (obj.type === "error" || obj.type === "turn.failed") {
            const msg = obj.message || obj.error?.message || "";
            if (msg) codexErrorText += (codexErrorText ? "\n" : "") + msg;
          }
          return;
        }
      } catch {
        // Not valid JSONL frame; treat as plain text below.
      }
    }
    if (!sawStreamJson) {
      process.stdout.write(hasNewline ? `${rawLine}\n` : rawLine);
    }
  };

  const flushStdoutLines = () => {
    if (!stdoutLineBuf) return;
    processStdoutLine(stdoutLineBuf, false);
    stdoutLineBuf = "";
  };

  const resolvedText = () => {
    if (!sawStreamJson) return stdout;
    if (spec.cli === "claude") {
      if (claudeResultText !== null) return claudeResultText;
      const parts = [...claudeAssistantMsgs];
      if (claudeDeltaBuf.trim()) parts.push(claudeDeltaBuf);
      return parts.join("\n\n");
    }
    if (codexAgentMsgs.length > 0) return codexAgentMsgs.join("\n\n");
    return stdout;
  };

  const writePartialIfAny = () => {
    flushStdoutLines();
    if (!outPath || existsSync(outPath)) return;
    const partial = resolvedText();
    if (!partial || !partial.trim()) return;
    try {
      const normalized = partial.endsWith("\n") ? partial : `${partial}\n`;
      writeFileSync(`${outPath}.partial`, normalized, "utf8");
    } catch {
      // Best-effort checkpoint only.
    }
  };

  let idleTimer = null;
  const clearTimers = () => {
    clearTimeout(wallTimer);
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const onTimeout = (reasonMsg) => {
    if (settled) return;
    settled = true;
    clearTimers();
    writePartialIfAny();
    terminateAndFinish(child, () => {
      cleanupOnce();
      console.error(reasonMsg);
      process.exit(124);
    });
  };

  const wallTimer = setTimeout(() => {
    onTimeout(`Timed out after ${opts.timeoutMs}ms waiting for ${cmd}`);
  }, opts.timeoutMs);

  const resetIdleTimer = () => {
    if (settled) return;
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      onTimeout(`Idle timeout after ${effectiveIdleMs}ms without output from ${cmd}`);
    }, effectiveIdleMs);
  };
  resetIdleTimer();

  const onSignal = (sig) => {
    if (settled) return;
    settled = true;
    clearTimers();
    writePartialIfAny();
    terminateAndFinish(child, () => {
      cleanupOnce();
      console.error(`Interrupted by ${sig}`);
      process.exit(1);
    });
  };
  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));

  child.stdin.on("error", (err) => {
    if (err && (err.code === "EPIPE" || err.code === "EOF" || err.code === "ERR_STREAM_DESTROYED")) {
      return;
    }
    console.error(`stdin write error: ${err.message}`);
  });

  child.stdout.on("data", (chunk) => {
    resetIdleTimer();
    const text = chunk.toString("utf8");
    stdout += text;
    stdoutLineBuf += text;
    let idx = stdoutLineBuf.indexOf("\n");
    while (idx !== -1) {
      const line = stdoutLineBuf.slice(0, idx);
      stdoutLineBuf = stdoutLineBuf.slice(idx + 1);
      processStdoutLine(line, true);
      idx = stdoutLineBuf.indexOf("\n");
    }
  });

  child.stderr.on("data", (chunk) => {
    resetIdleTimer();
    const text = chunk.toString("utf8");
    stderr += text;
    process.stderr.write(chunk);
  });

  child.on("error", (err) => {
    if (settled) return;
    settled = true;
    clearTimers();
    writePartialIfAny();
    cleanupOnce();
    console.error(`Failed to launch ${cmd}: ${err.message}`);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    if (settled) return;
    settled = true;
    clearTimers();
    flushStdoutLines();

    if (snapshot) {
      let clean = true;
      try {
        clean = snapshot.verifyUnmodified();
      } catch {
        clean = false;
      }
      cleanupOnce();
      if (!clean) {
        console.error(
          JSON.stringify({
            event: "readonly_violation",
            status: "snapshot_mutated",
            exitCode: EXIT_READONLY_VIOLATION,
          }),
        );
        process.exit(EXIT_READONLY_VIOLATION);
      }
    }

    const finalOut = resolvedText();
    if (code === 0) {
      if (sawStreamJson && finalOut) {
        const normalized = finalOut.endsWith("\n") ? finalOut : `${finalOut}\n`;
        process.stdout.write(normalized);
        if (outPath && (spec.cli === "claude" || !existsSync(outPath))) {
          writeFileSync(outPath, normalized, "utf8");
        }
      } else if (outPath && spec.cli === "claude") {
        writeFileSync(outPath, stdout, "utf8");
      }
    } else {
      writePartialIfAny();
    }
    if (code === null) {
      console.error(`${cmd} terminated by signal ${signal}`);
      process.exit(1);
    }
    const combinedErr = [stderr, claudeErrorText, codexErrorText].filter(Boolean).join("\n");
    if (code !== 0 && isQuotaFailure(combinedErr, finalOut)) {
      console.error(
        JSON.stringify({
          event: "external_agent_quota",
          status: "quota_exhausted",
          httpStatus: 429,
          vendor: spec.vendor,
          cli: spec.cli,
          model: spec.model,
          exitCode: EXIT_QUOTA,
        }),
      );
      process.exit(EXIT_QUOTA);
    }
    process.exit(code);
  });

  child.stdin.end(promptText);
}

main();
